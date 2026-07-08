import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import { AmenityAbstractSqlDao } from '../abstract/amenity.abstract';
import { MsSqlConstants } from '../connection/constants.mssql';
import { Amenity, AmenityColumns } from '../models';
import AppLogger from '@app/core/logger/app-logger';
import { AppResponse, createResponse } from '@app/shared/appresponse.shared';
import { messages } from '@app/shared/messages.shared';

@Injectable()
export class AmenitySqlDao implements AmenityAbstractSqlDao {
	constructor(
		@Inject(MsSqlConstants.AMENITIES) private _amenityModel: typeof Amenity,
		readonly _loggerSvc: AppLogger
	) {}

	async listAmenities(): Promise<AppResponse> {
		try {
			const amenities = await this._amenityModel.findAll({
				where: { [AmenityColumns.IsActive]: true },
				attributes: [AmenityColumns.Id, AmenityColumns.Name],
				order: [[AmenityColumns.Name, 'ASC']]
			});
			return createResponse(HttpStatus.OK, messages.M1, amenities);
		} catch (error: any) {
			this._loggerSvc.error(error, HttpStatus.INTERNAL_SERVER_ERROR);
			return createResponse(HttpStatus.INTERNAL_SERVER_ERROR, messages.E2);
		}
	}
}
