import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import { Op } from 'sequelize';
import { CityAbstractSqlDao } from '../abstract/city.abstract';
import { MsSqlConstants } from '../connection/constants.mssql';
import { City, CityColumns } from '../models';
import AppLogger from '@app/core/logger/app-logger';
import { AppResponse, createResponse } from '@app/shared/appresponse.shared';
import { messages } from '@app/shared/messages.shared';

@Injectable()
export class CitySqlDao implements CityAbstractSqlDao {
	constructor(
		@Inject(MsSqlConstants.CITIES) private _cityModel: typeof City,
		readonly _loggerSvc: AppLogger
	) {}

	async listCities(search?: string): Promise<AppResponse> {
		try {
			const where: Record<string, any> = { [CityColumns.IsActive]: true };
			if (search?.trim()) {
				where[CityColumns.Name] = { [Op.like]: `%${search.trim()}%` };
			}
			const cities = await this._cityModel.findAll({
				where,
				attributes: [CityColumns.Id, CityColumns.Name, CityColumns.State],
				order: [[CityColumns.Name, 'ASC']]
			});
			return createResponse(HttpStatus.OK, messages.C1, cities);
		} catch (error: any) {
			this._loggerSvc.error(error, HttpStatus.INTERNAL_SERVER_ERROR);
			return createResponse(HttpStatus.INTERNAL_SERVER_ERROR, messages.E2);
		}
	}
}
