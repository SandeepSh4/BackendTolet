import { AppResponse } from '@app/shared/appresponse.shared';

export abstract class PropertyTypeAbstractSvc {
	abstract listPropertyTypes(): Promise<AppResponse>;
}
