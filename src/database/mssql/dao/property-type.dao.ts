import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import { PropertyTypeAbstractSqlDao } from '../abstract/property-type.abstract';
import { MsSqlConstants } from '../connection/constants.mssql';
import { PropertyType, PropertyTypeColumns } from '../models';
import AppLogger from '@app/core/logger/app-logger';
import { AppResponse, createResponse } from '@app/shared/appresponse.shared';
import { messages } from '@app/shared/messages.shared';

@Injectable()
export class PropertyTypeSqlDao implements PropertyTypeAbstractSqlDao {
	constructor(
		@Inject(MsSqlConstants.PROPERTY_TYPES) private _propertyTypeModel: typeof PropertyType,
		readonly _loggerSvc: AppLogger
	) {}

	async listPropertyTypes(): Promise<AppResponse> {
		try {
			const types = await this._propertyTypeModel.findAll({
				where: { [PropertyTypeColumns.IsActive]: true },
				// Capability flags ride along so the UI can offer only the valid
				// listing intents (sell / rent / short-stay) for the chosen type.
				attributes: [
					PropertyTypeColumns.Id,
					PropertyTypeColumns.Name,
					PropertyTypeColumns.AllowsSale,
					PropertyTypeColumns.AllowsRent,
					PropertyTypeColumns.AllowsShortStay
				],
				order: [
					[PropertyTypeColumns.SortOrder, 'ASC'],
					[PropertyTypeColumns.Name, 'ASC']
				]
			});
			return createResponse(HttpStatus.OK, messages.PT1, types);
		} catch (error: any) {
			this._loggerSvc.error(error, HttpStatus.INTERNAL_SERVER_ERROR);
			return createResponse(HttpStatus.INTERNAL_SERVER_ERROR, messages.E2);
		}
	}
}
