// Single authenticated namespace for all realtime traffic. Notifications ride
// on it today; the messaging phase adds its events to the SAME namespace so the
// client keeps one connection.
export const REALTIME_NAMESPACE = '/realtime';

// Socket.IO path (distinct from the REST prefix so proxies can route it).
export const REALTIME_PATH = '/ws';

export enum RealtimeEvents {
	// Server → client: a freshly persisted notification (payload already parsed).
	NOTIFICATION = 'notification',

	//#region chat
	// Server → client: a new message for a conversation the user is part of.
	MESSAGE_NEW = 'message:new',
	// Server → client: tick updates ({ kind: 'delivered'|'read', ... }).
	MESSAGE_STATUS = 'message:status',
	// Relayed both ways: peer is typing in a conversation.
	TYPING = 'typing',

	// Client → server (handled via @SubscribeMessage):
	SEND_MESSAGE = 'message:send',
	ACK_DELIVERED = 'message:delivered',
	MARK_READ = 'message:read'
	//#endregion
}

// Room naming — one room per user; everything targeted at a user goes there.
export const userRoom = (userId: string): string => `user:${userId}`;
