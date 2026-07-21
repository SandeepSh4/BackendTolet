import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import { NotificationAbstractSqlDao } from '../abstract/notification.abstract';
import { MsSqlConstants } from '../connection/constants.mssql';
import { Notification, NotificationColumns } from '../models';
import AppLogger from '@app/core/logger/app-logger';
import { AppResponse, createResponse } from '@app/shared/appresponse.shared';
import { messages } from '@app/shared/messages.shared';
import { AtPayload } from '@app/shared/models.shared';

const MAX_NOTIFICATIONS = 50;

@Injectable()
export class NotificationSqlDao implements NotificationAbstractSqlDao {
	constructor(
		@Inject(MsSqlConstants.NOTIFICATIONS) private _notificationModel: typeof Notification,
		readonly _loggerSvc: AppLogger
	) {}

	async list(claims: AtPayload): Promise<AppResponse> {
		try {
			const rows = await this._notificationModel.findAll({
				where: { [NotificationColumns.UserId]: claims.sub },
				order: [['createdAt', 'DESC']],
				limit: MAX_NOTIFICATIONS
			});
			// Payload is stored as a JSON string — hand the UI parsed objects.
			const items = rows.map((r) => {
				const json: any = r.toJSON();
				try {
					json.payload = json.payload ? JSON.parse(json.payload) : null;
				} catch {
					/* leave as raw string */
				}
				return json;
			});
			return createResponse(HttpStatus.OK, messages.N1, items);
		} catch (error: any) {
			this._loggerSvc.error(error, HttpStatus.INTERNAL_SERVER_ERROR, claims?.sid);
			return createResponse(HttpStatus.INTERNAL_SERVER_ERROR, messages.E2);
		}
	}

	async unreadCount(claims: AtPayload): Promise<AppResponse> {
		try {
			const count = await this._notificationModel.count({
				where: { [NotificationColumns.UserId]: claims.sub, [NotificationColumns.ReadAt]: null }
			});
			return createResponse(HttpStatus.OK, messages.N1, { count });
		} catch (error: any) {
			this._loggerSvc.error(error, HttpStatus.INTERNAL_SERVER_ERROR, claims?.sid);
			return createResponse(HttpStatus.INTERNAL_SERVER_ERROR, messages.E2);
		}
	}

	async markRead(id: string, claims: AtPayload): Promise<AppResponse> {
		try {
			await this._notificationModel.update(
				{ [NotificationColumns.ReadAt]: new Date() } as any,
				{ where: { [NotificationColumns.Id]: id, [NotificationColumns.UserId]: claims.sub } }
			);
			return createResponse(HttpStatus.OK, messages.N2);
		} catch (error: any) {
			this._loggerSvc.error(error, HttpStatus.INTERNAL_SERVER_ERROR, claims?.sid);
			return createResponse(HttpStatus.INTERNAL_SERVER_ERROR, messages.E2);
		}
	}

	async markAllRead(claims: AtPayload): Promise<AppResponse> {
		try {
			await this._notificationModel.update(
				{ [NotificationColumns.ReadAt]: new Date() } as any,
				{ where: { [NotificationColumns.UserId]: claims.sub, [NotificationColumns.ReadAt]: null } }
			);
			return createResponse(HttpStatus.OK, messages.N2);
		} catch (error: any) {
			this._loggerSvc.error(error, HttpStatus.INTERNAL_SERVER_ERROR, claims?.sid);
			return createResponse(HttpStatus.INTERNAL_SERVER_ERROR, messages.E2);
		}
	}
}
