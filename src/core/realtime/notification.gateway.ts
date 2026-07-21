import { HttpStatus } from '@nestjs/common';
import {
	ConnectedSocket,
	MessageBody,
	OnGatewayConnection,
	OnGatewayDisconnect,
	OnGatewayInit,
	SubscribeMessage,
	WebSocketGateway,
	WebSocketServer
} from '@nestjs/websockets';
import { Namespace, Socket } from 'socket.io';
import AppLogger from '@app/core/logger/app-logger';
import { AppResponse, createResponse } from '@app/shared/appresponse.shared';
import { messages } from '@app/shared/messages.shared';
import { AtPayload } from '@app/shared/models.shared';
import { DatabaseService } from '@app/database/database.service';
import { RealtimePublisherService } from './realtime-publisher.service';
import { REALTIME_NAMESPACE, REALTIME_PATH, RealtimeEvents, userRoom } from './realtime.constants';

// Sliding-window rate limit for message sends (anti-spam).
const RATE_LIMIT_COUNT = 20;
const RATE_LIMIT_WINDOW_MS = 10_000;

// Authenticated realtime gateway. The AuthSocketAdapter has already verified
// the JWT and attached `socket.claims` before a connection lands here.
// Notifications are push-only (fired by RealtimePublisherService from business
// code); chat adds three client→server events below — all persistence goes
// through the chat DAO, the gateway only routes.
@WebSocketGateway({ namespace: REALTIME_NAMESPACE, path: REALTIME_PATH, transports: ['websocket'] })
export class NotificationGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
	@WebSocketServer()
	server!: Namespace;

	private readonly _sendTimestamps = new Map<string, number[]>();

	constructor(
		readonly _loggerSvc: AppLogger,
		private readonly _publisher: RealtimePublisherService,
		private readonly _dbSvc: DatabaseService
	) {}

	afterInit(): void {
		this._publisher.setNamespace(this.server);
		this._loggerSvc.log('Realtime gateway initialized', HttpStatus.OK);
	}

	async handleConnection(client: Socket): Promise<void> {
		const claims = this._claims(client);
		if (!claims?.sub) {
			// The adapter middleware should make this unreachable — belt and braces.
			client.disconnect(true);
			return;
		}
		client.join(userRoom(claims.sub));
		this._loggerSvc.log(`Realtime connected: user ${claims.sub}`, HttpStatus.OK);

		// Delivery sweep: everything sent to this user while offline is delivered
		// the moment they connect — each sender's ticks flip to grey doubles.
		const swept = await this._dbSvc.chatSqlTxn.sweepDeliveries(claims.sub);
		for (const item of swept) {
			this._publisher.publishToUser(item.senderId, RealtimeEvents.MESSAGE_STATUS, {
				kind: 'delivered',
				conversationId: item.conversationId,
				messageIds: item.messageIds,
				deliveredAt: item.deliveredAt
			});
		}
	}

	handleDisconnect(client: Socket): void {
		const claims = this._claims(client);
		if (claims?.sub) {
			this._sendTimestamps.delete(claims.sub);
			this._loggerSvc.log(`Realtime disconnected: user ${claims.sub}`, HttpStatus.OK);
		}
	}

	// Send: persist → ack the saved row to the sender (single tick) → push
	// MESSAGE_NEW to the recipient's room.
	@SubscribeMessage(RealtimeEvents.SEND_MESSAGE)
	async onSendMessage(
		@MessageBody() data: { conversationId: string; body: string; tempId?: string },
		@ConnectedSocket() client: Socket
	): Promise<AppResponse> {
		const claims = this._claims(client);
		if (!claims?.sub) return createResponse(HttpStatus.UNAUTHORIZED, messages.E3);
		if (!data?.conversationId || typeof data.body !== 'string') {
			return createResponse(HttpStatus.BAD_REQUEST, messages.CH7);
		}
		if (!this._withinRateLimit(claims.sub)) {
			return createResponse(HttpStatus.TOO_MANY_REQUESTS, messages.CH8);
		}

		const result = await this._dbSvc.chatSqlTxn.sendMessage(data.conversationId, data.body, claims);
		if (result.code !== HttpStatus.CREATED) return result;

		const { message, recipientId } = result.data as any;
		this._publisher.publishToUser(recipientId, RealtimeEvents.MESSAGE_NEW, message);
		// Ack carries the persisted row + the client's tempId for optimistic-UI reconciliation.
		return createResponse(HttpStatus.CREATED, messages.CH4, { ...message, tempId: data.tempId });
	}

	// Recipient acks receipt of a pushed message → sender's grey double tick.
	// Returns an ack so callers awaiting the emit callback always resolve.
	@SubscribeMessage(RealtimeEvents.ACK_DELIVERED)
	async onAckDelivered(@MessageBody() data: { messageId: string }, @ConnectedSocket() client: Socket): Promise<AppResponse> {
		const claims = this._claims(client);
		if (!claims?.sub || !data?.messageId) return createResponse(HttpStatus.BAD_REQUEST, messages.E2);
		const delivered = await this._dbSvc.chatSqlTxn.markDelivered(data.messageId, claims.sub);
		if (delivered) {
			this._publisher.publishToUser(delivered.senderId, RealtimeEvents.MESSAGE_STATUS, {
				kind: 'delivered',
				conversationId: delivered.conversationId,
				messageIds: [delivered.messageId],
				deliveredAt: delivered.deliveredAt
			});
		}
		return createResponse(HttpStatus.OK, messages.N2);
	}

	// Recipient viewed the thread → sender's blue ticks for everything sent so far.
	@SubscribeMessage(RealtimeEvents.MARK_READ)
	async onMarkRead(@MessageBody() data: { conversationId: string }, @ConnectedSocket() client: Socket): Promise<AppResponse> {
		const claims = this._claims(client);
		if (!claims?.sub || !data?.conversationId) return createResponse(HttpStatus.BAD_REQUEST, messages.E2);
		const read = await this._dbSvc.chatSqlTxn.markRead(data.conversationId, claims.sub);
		if (read) {
			this._publisher.publishToUser(read.peerId, RealtimeEvents.MESSAGE_STATUS, {
				kind: 'read',
				conversationId: read.conversationId,
				readAt: read.readAt
			});
		}
		return createResponse(HttpStatus.OK, messages.N2);
	}

	// Ephemeral typing relay — membership-checked, never persisted.
	@SubscribeMessage(RealtimeEvents.TYPING)
	async onTyping(@MessageBody() data: { conversationId: string }, @ConnectedSocket() client: Socket): Promise<void> {
		const claims = this._claims(client);
		if (!claims?.sub || !data?.conversationId) return;
		const peerId = await this._dbSvc.chatSqlTxn.getPeer(data.conversationId, claims.sub);
		if (peerId) {
			this._publisher.publishToUser(peerId, RealtimeEvents.TYPING, { conversationId: data.conversationId, userId: claims.sub });
		}
	}

	//#region private helpers
	private _claims(client: Socket): AtPayload | undefined {
		return (client as any).claims;
	}

	private _withinRateLimit(userId: string): boolean {
		const now = Date.now();
		const stamps = (this._sendTimestamps.get(userId) ?? []).filter((t) => now - t < RATE_LIMIT_WINDOW_MS);
		if (stamps.length >= RATE_LIMIT_COUNT) return false;
		stamps.push(now);
		this._sendTimestamps.set(userId, stamps);
		return true;
	}
	//#endregion
}
