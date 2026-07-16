import { Controller, Get, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Authorize } from '@app/core/decorators/authorization.decorator';
import { AppResponse } from '@app/shared/appresponse.shared';
import { GeoAbstractSvc } from './geo.abstract';
import { ReverseGeocodeDto, SuggestPlacesDto } from './dto/geo.dto';

@Controller('geo')
@ApiTags('Geo')
export class GeoController {
	constructor(private readonly _geoSvc: GeoAbstractSvc) {}

	@Authorize()
	@Get('suggest')
	@ApiOperation({ summary: 'Autosuggest places/localities (Mappls proxy)' })
	async suggest(@Query() query: SuggestPlacesDto): Promise<AppResponse> {
		return this._geoSvc.suggest(query);
	}

	@Authorize()
	@Get('reverse')
	@ApiOperation({ summary: 'Reverse-geocode coordinates to an address (Mappls proxy)' })
	async reverse(@Query() query: ReverseGeocodeDto): Promise<AppResponse> {
		return this._geoSvc.reverse(query);
	}

	@Authorize()
	@Get('map-token')
	@ApiOperation({ summary: 'Short-lived Mappls access token for the web map SDK' })
	async mapToken(): Promise<AppResponse> {
		return this._geoSvc.mapToken();
	}
}
