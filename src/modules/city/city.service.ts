import { Injectable } from '@nestjs/common';
import { CityAbstractSvc } from './city.abstract';
import { DatabaseService } from '@app/database/database.service';
import { AppResponse } from '@app/shared/appresponse.shared';

@Injectable()
export class CityService implements CityAbstractSvc {
	constructor(private readonly _dbSvc: DatabaseService) {}

	async listCities(search?: string): Promise<AppResponse> {
		return this._dbSvc.citySqlTxn.listCities(search);
	}
}
