import { Injectable } from '@nestjs/common';
import { SessionAbstractSvc } from './session.abstract';
import { DatabaseService } from '@app/database/database.service';
import { AppResponse } from '@app/shared/appresponse.shared';
import { AtPayload } from '@app/shared/models.shared';

@Injectable()
export class SessionService implements SessionAbstractSvc {
	constructor(private readonly _dbSvc: DatabaseService) {}

	async listSessions(claims: AtPayload): Promise<AppResponse> {
		return this._dbSvc.sessionSqlTxn.listSessions(claims);
	}

	async revokeSession(sessionId: string, claims: AtPayload): Promise<AppResponse> {
		return this._dbSvc.sessionSqlTxn.revokeSession(sessionId, claims);
	}
}
