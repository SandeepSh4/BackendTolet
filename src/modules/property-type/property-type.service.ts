import { Injectable } from '@nestjs/common';
import { PropertyTypeAbstractSvc } from './property-type.abstract';
import { DatabaseService } from '@app/database/database.service';
import { AppResponse } from '@app/shared/appresponse.shared';

@Injectable()
export class PropertyTypeService implements PropertyTypeAbstractSvc {
	constructor(private readonly _dbSvc: DatabaseService) {}

	async listPropertyTypes(): Promise<AppResponse> {
		return this._dbSvc.propertyTypeSqlTxn.listPropertyTypes();
	}
}
