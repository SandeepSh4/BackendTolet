import { AppResponse } from '@app/shared/appresponse.shared';
import { AtPayload } from '@app/shared/models.shared';

// Delivery-sweep result: which senders must be told their messages were delivered.
export interface DeliverySweepItem {
	senderId: string;
	conversationId: string;
	messageIds: string[];
	deliveredAt: string;
}

export abstract class ChatAbstractSqlDao {
	abstract openConversation(applicationId: string, claims: AtPayload): Promise<AppResponse>;
	abstract myConversations(claims: AtPayload): Promise<AppResponse>;
	abstract getMessages(conversationId: string, claims: AtPayload, before?: string, limit?: number): Promise<AppResponse>;
	abstract sendMessage(conversationId: string, body: string, claims: AtPayload): Promise<AppResponse>;
	abstract markDelivered(messageId: string, userId: string): Promise<{ senderId: string; conversationId: string; messageId: string; deliveredAt: string } | null>;
	abstract markRead(conversationId: string, userId: string): Promise<{ peerId: string; conversationId: string; readAt: string } | null>;
	abstract sweepDeliveries(userId: string): Promise<DeliverySweepItem[]>;
	abstract getPeer(conversationId: string, userId: string): Promise<string | null>;
}
