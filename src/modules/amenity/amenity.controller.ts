import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Authorize } from '@app/core/decorators/authorization.decorator';
import { AppResponse } from '@app/shared/appresponse.shared';
import { AmenityAbstractSvc } from './amenity.abstract';

@Controller('amenities')
@ApiTags('Amenity')
export class AmenityController {
	constructor(private readonly _amenitySvc: AmenityAbstractSvc) {}

	@Authorize()
	@Get()
	@ApiOperation({ summary: 'List active amenities' })
	async list(): Promise<AppResponse> {
		return this._amenitySvc.listAmenities();
	}
}
