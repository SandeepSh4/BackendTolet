import { AppResponse } from '@app/shared/appresponse.shared';

export abstract class CityAbstractSqlDao {
	abstract listCities(search?: string): Promise<AppResponse>;
}
