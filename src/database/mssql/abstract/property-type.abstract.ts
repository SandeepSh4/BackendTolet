import { AppResponse } from '@app/shared/appresponse.shared';

export abstract class PropertyTypeAbstractSqlDao {
	abstract listPropertyTypes(): Promise<AppResponse>;
}
