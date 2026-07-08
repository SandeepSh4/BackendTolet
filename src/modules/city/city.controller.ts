import { Controller, Get, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Authorize } from '@app/core/decorators/authorization.decorator';
import { AppResponse } from '@app/shared/appresponse.shared';
import { CityAbstractSvc } from './city.abstract';

@Controller('cities')
@ApiTags('City')
export class CityController {
	constructor(private readonly _citySvc: CityAbstractSvc) {}

	@Authorize()
	@Get()
	@ApiOperation({ summary: 'List active cities (optional name search)' })
	async list(@Query('search') search?: string): Promise<AppResponse> {
		return this._citySvc.listCities(search);
	}
}
