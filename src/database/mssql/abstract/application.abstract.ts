import { AppResponse } from '@app/shared/appresponse.shared';
import { AtPayload } from '@app/shared/models.shared';
import { CreateApplicationDto, DecideApplicationDto, ReceivedApplicationsDto } from '@app/modules/application/dto/application.dto';

export abstract class ApplicationAbstractSqlDao {
	abstract apply(info: CreateApplicationDto, claims: AtPayload): Promise<AppResponse>;
	abstract myApplications(claims: AtPayload): Promise<AppResponse>;
	abstract received(filters: ReceivedApplicationsDto, claims: AtPayload): Promise<AppResponse>;
	abstract decide(id: string, info: DecideApplicationDto, claims: AtPayload): Promise<AppResponse>;
	abstract withdraw(id: string, claims: AtPayload): Promise<AppResponse>;
}
