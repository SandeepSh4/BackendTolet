import { AppResponse } from '@app/shared/appresponse.shared';

export abstract class AmenityAbstractSqlDao {
	abstract listAmenities(): Promise<AppResponse>;
}
