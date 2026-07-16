import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Authorize } from '@app/core/decorators/authorization.decorator';
import { AppResponse } from '@app/shared/appresponse.shared';
import { PropertyTypeAbstractSvc } from './property-type.abstract';

@Controller('property-types')
@ApiTags('PropertyType')
export class PropertyTypeController {
	constructor(private readonly _propertyTypeSvc: PropertyTypeAbstractSvc) {}

	@Authorize()
	@Get()
	@ApiOperation({ summary: 'List active property types' })
	async list(): Promise<AppResponse> {
		return this._propertyTypeSvc.listPropertyTypes();
	}
}
