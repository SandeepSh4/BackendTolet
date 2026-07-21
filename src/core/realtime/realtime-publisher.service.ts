import { Injectable } from '@nestjs/common';
import { Namespace } from 'socket.io';
import { RealtimeEvents, userRoom } from './realtime.constants';

// The one place the rest of the app touches sockets. The gateway hands its
// namespace in after init; publishers (application DAO today, messaging later)
// emit through this service and never import socket.io themselves. Emitting is
// always best-effort — the notification row is already persisted, so a user
// who is offline simply picks it up from the API.
@Injectable()
export class RealtimePublisherService {
	private _namespace: Namespace | null = null;

	setNamespace(namespace: Namespace): void {
		this._namespace = namespace;
	}

	publishToUser(userId: string, event: RealtimeEvents, data: unknown): void {
		try {
			this._namespace?.to(userRoom(userId)).emit(event, data);
		} catch {
			/* realtime is an enhancement — never let it break the main action */
		}
	}
}
