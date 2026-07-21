import { Injectable } from '@nestjs/common';
import { NotificationAbstractSvc } from './notification.abstract';
import { DatabaseService } from '@app/database/database.service';
import { AppResponse } from '@app/shared/appresponse.shared';
import { AtPayload } from '@app/shared/models.shared';

@Injectable()
export class NotificationService implements NotificationAbstractSvc {
	constructor(private readonly _dbSvc: DatabaseService) {}

	async list(claims: AtPayload): Promise<AppResponse> {
		return this._dbSvc.notificationSqlTxn.list(claims);
	}

	async unreadCount(claims: AtPayload): Promise<AppResponse> {
		return this._dbSvc.notificationSqlTxn.unreadCount(claims);
	}

	async markRead(id: string, claims: AtPayload): Promise<AppResponse> {
		return this._dbSvc.notificationSqlTxn.markRead(id, claims);
	}

	async markAllRead(claims: AtPayload): Promise<AppResponse> {
		return this._dbSvc.notificationSqlTxn.markAllRead(claims);
	}
}
