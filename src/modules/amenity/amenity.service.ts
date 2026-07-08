import { Injectable } from '@nestjs/common';
import { AmenityAbstractSvc } from './amenity.abstract';
import { DatabaseService } from '@app/database/database.service';
import { AppResponse } from '@app/shared/appresponse.shared';

@Injectable()
export class AmenityService implements AmenityAbstractSvc {
	constructor(private readonly _dbSvc: DatabaseService) {}

	async listAmenities(): Promise<AppResponse> {
		return this._dbSvc.amenitySqlTxn.listAmenities();
	}
}
