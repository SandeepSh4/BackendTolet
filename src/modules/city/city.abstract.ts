import { AppResponse } from '@app/shared/appresponse.shared';

export abstract class CityAbstractSvc {
	abstract listCities(search?: string): Promise<AppResponse>;
}
