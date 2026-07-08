import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import { SessionAbstractSqlDao } from '../abstract/session.abstract';
import { MsSqlConstants } from '../connection/constants.mssql';
import { UserSession, UserSessionColumns } from '../models';
import AppLogger from '@app/core/logger/app-logger';
import { AppResponse, createResponse } from '@app/shared/appresponse.shared';
import { messages } from '@app/shared/messages.shared';
import { AtPayload } from '@app/shared/models.shared';

@Injectable()
export class SessionSqlDao implements SessionAbstractSqlDao {
	constructor(
		@Inject(MsSqlConstants.USER_SESSIONS) private _sessionModel: typeof UserSession,
		readonly _loggerSvc: AppLogger
	) {}

	//#region listSessions
	async listSessions(claims: AtPayload): Promise<AppResponse> {
		try {
			const sessions = await this._sessionModel.findAll({
				where: {
					[UserSessionColumns.UserId]: claims.sub,
					[UserSessionColumns.RevokedAt]: null
				},
				attributes: [
					UserSessionColumns.Id,
					UserSessionColumns.UserAgent,
					UserSessionColumns.IpAddress,
					UserSessionColumns.ExpiresAt,
					'createdAt',
					'updatedAt'
				],
				order: [['createdAt', 'DESC']]
			});

			// Drop any that have silently expired and flag the caller's current session.
			const now = Date.now();
			const active = sessions
				.filter((s) => !s.expiresAt || s.expiresAt.getTime() >= now)
				.map((s) => ({ ...s.toJSON(), isCurrent: s.id === claims.sid }));

			return createResponse(HttpStatus.OK, messages.A13, active);
		} catch (error: any) {
			this._loggerSvc.error(error, HttpStatus.INTERNAL_SERVER_ERROR, claims?.sid);
			return createResponse(HttpStatus.INTERNAL_SERVER_ERROR, messages.E2);
		}
	}
	//#endregion

	//#region revokeSession
	async revokeSession(sessionId: string, claims: AtPayload): Promise<AppResponse> {
		try {
			const session = await this._sessionModel.findByPk(sessionId);
			// Only allow revoking a session the caller actually owns.
			if (!session || session.userId !== claims.sub) {
				return createResponse(HttpStatus.FORBIDDEN, messages.A6);
			}

			if (!session.revokedAt) {
				await session.update({ [UserSessionColumns.RevokedAt]: new Date() } as any);
			}
			return createResponse(HttpStatus.OK, messages.A2);
		} catch (error: any) {
			this._loggerSvc.error(error, HttpStatus.INTERNAL_SERVER_ERROR, claims?.sid);
			return createResponse(HttpStatus.INTERNAL_SERVER_ERROR, messages.E2);
		}
	}
	//#endregion
}
