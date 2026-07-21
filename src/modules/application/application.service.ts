import { Injectable } from '@nestjs/common';
import { ApplicationAbstractSvc } from './application.abstract';
import { DatabaseService } from '@app/database/database.service';
import { AppResponse } from '@app/shared/appresponse.shared';
import { AtPayload } from '@app/shared/models.shared';
import { CreateApplicationDto, DecideApplicationDto, ReceivedApplicationsDto } from './dto/application.dto';

@Injectable()
export class ApplicationService implements ApplicationAbstractSvc {
	constructor(private readonly _dbSvc: DatabaseService) {}

	async apply(info: CreateApplicationDto, claims: AtPayload): Promise<AppResponse> {
		return this._dbSvc.applicationSqlTxn.apply(info, claims);
	}

	async myApplications(claims: AtPayload): Promise<AppResponse> {
		return this._dbSvc.applicationSqlTxn.myApplications(claims);
	}

	async received(filters: ReceivedApplicationsDto, claims: AtPayload): Promise<AppResponse> {
		return this._dbSvc.applicationSqlTxn.received(filters, claims);
	}

	async decide(id: string, info: DecideApplicationDto, claims: AtPayload): Promise<AppResponse> {
		return this._dbSvc.applicationSqlTxn.decide(id, info, claims);
	}

	async withdraw(id: string, claims: AtPayload): Promise<AppResponse> {
		return this._dbSvc.applicationSqlTxn.withdraw(id, claims);
	}
}
