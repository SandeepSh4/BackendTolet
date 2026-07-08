import { AppResponse } from '@app/shared/appresponse.shared';

export abstract class AmenityAbstractSvc {
	abstract listAmenities(): Promise<AppResponse>;
}
