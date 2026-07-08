import { AppResponse } from '@app/shared/appresponse.shared';
import { AtPayload } from '@app/shared/models.shared';

export abstract class SessionAbstractSqlDao {
	abstract listSessions(claims: AtPayload): Promise<AppResponse>;
	abstract revokeSession(sessionId: string, claims: AtPayload): Promise<AppResponse>;
}
