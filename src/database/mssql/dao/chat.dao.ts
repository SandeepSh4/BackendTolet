import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import { Op } from 'sequelize';
import { ChatAbstractSqlDao, DeliverySweepItem } from '../abstract/chat.abstract';
import { MsSqlConstants } from '../connection/constants.mssql';
import {
	Conversation,
	ConversationColumns,
	Message,
	MessageColumns,
	PropertyApplication,
	PropertyApplicationColumns,
	Property,
	PropertyColumns,
	User,
	UserColumns
} from '../models';
import AppLogger from '@app/core/logger/app-logger';
import { AppResponse, createResponse } from '@app/shared/appresponse.shared';
import { messages } from '@app/shared/messages.shared';
import { AtPayload } from '@app/shared/models.shared';
import { ApplicationStatus } from '@app/core/enums/domain.enum';

const PAGE_LIMIT = 50;
const MAX_BODY_LENGTH = 2000;

// Canonical participant order so the unique (participantA, participantB) index
// can never produce two threads for the same pair.
const orderPair = (u1: string, u2: string): [string, string] => (u1.toLowerCase() < u2.toLowerCase() ? [u1, u2] : [u2, u1]);

@Injectable()
export class ChatSqlDao implements ChatAbstractSqlDao {
	constructor(
		@Inject(MsSqlConstants.CONVERSATIONS) private _conversationModel: typeof Conversation,
		@Inject(MsSqlConstants.MESSAGES) private _messageModel: typeof Message,
		@Inject(MsSqlConstants.PROPERTY_APPLICATIONS) private _applicationModel: typeof PropertyApplication,
		@Inject(MsSqlConstants.PROPERTIES) private _propertyModel: typeof Property,
		@Inject(MsSqlConstants.USERS) private _userModel: typeof User,
		readonly _loggerSvc: AppLogger
	) {}

	// The gate: a conversation opens only from an ACCEPTED application, and only
	// for its two parties (the seeker and the property's owner).
	async openConversation(applicationId: string, claims: AtPayload): Promise<AppResponse> {
		try {
			const application = await this._applicationModel.findByPk(applicationId, {
				include: [{ model: this._propertyModel, attributes: [PropertyColumns.Id, PropertyColumns.Title, PropertyColumns.OwnerId] }]
			});
			if (!application || !application.property) {
				return createResponse(HttpStatus.NOT_FOUND, messages.AP6);
			}
			if (application.status !== ApplicationStatus.ACCEPTED) {
				return createResponse(HttpStatus.FORBIDDEN, messages.CH6);
			}
			const ownerId = application.property.ownerId;
			const seekerId = application.seekerId;
			if (claims.sub !== ownerId && claims.sub !== seekerId) {
				return createResponse(HttpStatus.FORBIDDEN, messages.E7.replace('{0}', 'open this conversation'));
			}

			const [participantA, participantB] = orderPair(ownerId, seekerId);
			const [conversation] = await this._conversationModel.findOrCreate({
				where: { [ConversationColumns.ParticipantA]: participantA, [ConversationColumns.ParticipantB]: participantB },
				defaults: {
					[ConversationColumns.ParticipantA]: participantA,
					[ConversationColumns.ParticipantB]: participantB,
					[ConversationColumns.PropertyId]: application.property.id
				} as any
			});

			return createResponse(HttpStatus.OK, messages.CH1, await this._serializeConversation(conversation, claims.sub));
		} catch (error: any) {
			this._loggerSvc.error(error, HttpStatus.INTERNAL_SERVER_ERROR, claims?.sid);
			return createResponse(HttpStatus.INTERNAL_SERVER_ERROR, messages.E2);
		}
	}

	async myConversations(claims: AtPayload): Promise<AppResponse> {
		try {
			const conversations = await this._conversationModel.findAll({
				where: {
					[Op.or]: [{ [ConversationColumns.ParticipantA]: claims.sub }, { [ConversationColumns.ParticipantB]: claims.sub }]
				},
				order: [['lastMessageAt', 'DESC']]
			});
			const items = await Promise.all(conversations.map((c) => this._serializeConversation(c, claims.sub)));
			return createResponse(HttpStatus.OK, messages.CH2, items);
		} catch (error: any) {
			this._loggerSvc.error(error, HttpStatus.INTERNAL_SERVER_ERROR, claims?.sid);
			return createResponse(HttpStatus.INTERNAL_SERVER_ERROR, messages.E2);
		}
	}

	// History page (newest first). Doubles as a delivery sweep for the incoming
	// messages it returns — fetching history IS receiving.
	async getMessages(conversationId: string, claims: AtPayload, before?: string, limit = PAGE_LIMIT): Promise<AppResponse> {
		try {
			const conversation = await this._membershipCheck(conversationId, claims.sub);
			if (!conversation) {
				return createResponse(HttpStatus.NOT_FOUND, messages.CH5);
			}

			const where: Record<string | symbol, any> = { [MessageColumns.ConversationId]: conversationId };
			if (before) where['createdAt'] = { [Op.lt]: new Date(before) };

			const rows = await this._messageModel.findAll({
				where,
				order: [['createdAt', 'DESC']],
				limit: Math.min(Math.max(limit, 1), PAGE_LIMIT)
			});

			// Sweep: anything incoming and undelivered is delivered now.
			const undelivered = rows.filter((m) => m.senderId !== claims.sub && !m.deliveredAt).map((m) => m.id);
			if (undelivered.length) {
				await this._messageModel.update(
					{ [MessageColumns.DeliveredAt]: new Date() } as any,
					{ where: { [MessageColumns.Id]: { [Op.in]: undelivered } } }
				);
			}

			return createResponse(HttpStatus.OK, messages.CH3, rows.map((m) => m.toJSON()).reverse());
		} catch (error: any) {
			this._loggerSvc.error(error, HttpStatus.INTERNAL_SERVER_ERROR, claims?.sid);
			return createResponse(HttpStatus.INTERNAL_SERVER_ERROR, messages.E2);
		}
	}

	async sendMessage(conversationId: string, body: string, claims: AtPayload): Promise<AppResponse> {
		try {
			const trimmed = (body ?? '').trim();
			if (!trimmed) {
				return createResponse(HttpStatus.BAD_REQUEST, messages.CH7);
			}
			const conversation = await this._membershipCheck(conversationId, claims.sub);
			if (!conversation) {
				return createResponse(HttpStatus.NOT_FOUND, messages.CH5);
			}

			const message = await this._messageModel.create({
				[MessageColumns.ConversationId]: conversationId,
				[MessageColumns.SenderId]: claims.sub,
				[MessageColumns.Body]: trimmed.slice(0, MAX_BODY_LENGTH)
			} as any);
			await conversation.update({ [ConversationColumns.LastMessageAt]: new Date() } as any);

			const recipientId = conversation.participantA === claims.sub ? conversation.participantB : conversation.participantA;
			return createResponse(HttpStatus.CREATED, messages.CH4, { message: message.toJSON(), recipientId });
		} catch (error: any) {
			this._loggerSvc.error(error, HttpStatus.INTERNAL_SERVER_ERROR, claims?.sid);
			return createResponse(HttpStatus.INTERNAL_SERVER_ERROR, messages.E2);
		}
	}

	// Recipient acks receipt of one message (grey double tick for the sender).
	async markDelivered(messageId: string, userId: string) {
		try {
			const message = await this._messageModel.findByPk(messageId);
			if (!message || message.senderId === userId || message.deliveredAt) return null;
			const conversation = await this._membershipCheck(message.conversationId, userId);
			if (!conversation) return null;
			const deliveredAt = new Date();
			await message.update({ [MessageColumns.DeliveredAt]: deliveredAt } as any);
			return { senderId: message.senderId, conversationId: message.conversationId, messageId: message.id, deliveredAt: deliveredAt.toISOString() };
		} catch (error: any) {
			this._loggerSvc.error(error, HttpStatus.INTERNAL_SERVER_ERROR);
			return null;
		}
	}

	// Recipient viewed the thread: everything incoming becomes read (blue ticks).
	async markRead(conversationId: string, userId: string) {
		try {
			const conversation = await this._membershipCheck(conversationId, userId);
			if (!conversation) return null;
			const readAt = new Date();
			await this._messageModel.update(
				{ [MessageColumns.DeliveredAt]: readAt, [MessageColumns.ReadAt]: readAt } as any,
				{
					where: {
						[MessageColumns.ConversationId]: conversationId,
						[MessageColumns.SenderId]: { [Op.ne]: userId },
						[MessageColumns.ReadAt]: null
					}
				}
			);
			const peerId = conversation.participantA === userId ? conversation.participantB : conversation.participantA;
			return { peerId, conversationId, readAt: readAt.toISOString() };
		} catch (error: any) {
			this._loggerSvc.error(error, HttpStatus.INTERNAL_SERVER_ERROR);
			return null;
		}
	}

	// Connect-time sweep: everything addressed to this user that is still
	// undelivered becomes delivered, grouped by sender for the status emits.
	async sweepDeliveries(userId: string): Promise<DeliverySweepItem[]> {
		try {
			const conversations = await this._conversationModel.findAll({
				where: { [Op.or]: [{ [ConversationColumns.ParticipantA]: userId }, { [ConversationColumns.ParticipantB]: userId }] },
				attributes: [ConversationColumns.Id]
			});
			if (!conversations.length) return [];

			const pending = await this._messageModel.findAll({
				where: {
					[MessageColumns.ConversationId]: { [Op.in]: conversations.map((c) => c.id) },
					[MessageColumns.SenderId]: { [Op.ne]: userId },
					[MessageColumns.DeliveredAt]: null
				},
				attributes: [MessageColumns.Id, MessageColumns.SenderId, MessageColumns.ConversationId]
			});
			if (!pending.length) return [];

			const deliveredAt = new Date();
			await this._messageModel.update(
				{ [MessageColumns.DeliveredAt]: deliveredAt } as any,
				{ where: { [MessageColumns.Id]: { [Op.in]: pending.map((m) => m.id) } } }
			);

			const grouped = new Map<string, DeliverySweepItem>();
			for (const m of pending) {
				const key = `${m.senderId}|${m.conversationId}`;
				if (!grouped.has(key)) {
					grouped.set(key, { senderId: m.senderId, conversationId: m.conversationId, messageIds: [], deliveredAt: deliveredAt.toISOString() });
				}
				grouped.get(key)!.messageIds.push(m.id);
			}
			return Array.from(grouped.values());
		} catch (error: any) {
			this._loggerSvc.error(error, HttpStatus.INTERNAL_SERVER_ERROR);
			return [];
		}
	}

	async getPeer(conversationId: string, userId: string): Promise<string | null> {
		const conversation = await this._membershipCheck(conversationId, userId);
		if (!conversation) return null;
		return conversation.participantA === userId ? conversation.participantB : conversation.participantA;
	}

	//#region private helpers
	private async _membershipCheck(conversationId: string, userId: string): Promise<Conversation | null> {
		const conversation = await this._conversationModel.findByPk(conversationId);
		if (!conversation) return null;
		return conversation.participantA === userId || conversation.participantB === userId ? conversation : null;
	}

	// Thread summary for the list/dock: peer identity, property context, last
	// message preview and the viewer's unread count.
	private async _serializeConversation(conversation: Conversation, viewerId: string): Promise<any> {
		const peerId = conversation.participantA === viewerId ? conversation.participantB : conversation.participantA;
		const [peer, property, lastMessage, unreadCount] = await Promise.all([
			this._userModel.findByPk(peerId, { attributes: [UserColumns.Id, UserColumns.FullName] }),
			conversation.propertyId
				? this._propertyModel.findByPk(conversation.propertyId, { attributes: [PropertyColumns.Id, PropertyColumns.Title] })
				: Promise.resolve(null),
			this._messageModel.findOne({
				where: { [MessageColumns.ConversationId]: conversation.id },
				order: [['createdAt', 'DESC']],
				attributes: [MessageColumns.Id, MessageColumns.Body, MessageColumns.SenderId, 'createdAt']
			}),
			this._messageModel.count({
				where: {
					[MessageColumns.ConversationId]: conversation.id,
					[MessageColumns.SenderId]: { [Op.ne]: viewerId },
					[MessageColumns.ReadAt]: null
				}
			})
		]);

		return {
			id: conversation.id,
			peer: peer ? { id: peer.id, fullName: peer.fullName } : { id: peerId, fullName: 'User' },
			property: property ? { id: property.id, title: property.title } : null,
			lastMessageAt: conversation.lastMessageAt,
			lastMessage: lastMessage
				? { body: lastMessage.body.slice(0, 80), senderId: lastMessage.senderId, createdAt: (lastMessage as any).createdAt }
				: null,
			unreadCount
		};
	}
	//#endregion
}
