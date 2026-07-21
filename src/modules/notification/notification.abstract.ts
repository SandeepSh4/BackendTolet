import { AppResponse } from '@app/shared/appresponse.shared';
import { AtPayload } from '@app/shared/models.shared';

export abstract class NotificationAbstractSvc {
	abstract list(claims: AtPayload): Promise<AppResponse>;
	abstract unreadCount(claims: AtPayload): Promise<AppResponse>;
	abstract markRead(id: string, claims: AtPayload): Promise<AppResponse>;
	abstract markAllRead(claims: AtPayload): Promise<AppResponse>;
}
