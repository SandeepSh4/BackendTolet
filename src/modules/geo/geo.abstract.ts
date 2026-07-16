import { AppResponse } from '@app/shared/appresponse.shared';
import { ReverseGeocodeDto, SuggestPlacesDto } from './dto/geo.dto';

export abstract class GeoAbstractSvc {
	abstract suggest(query: SuggestPlacesDto): Promise<AppResponse>;
	abstract reverse(query: ReverseGeocodeDto): Promise<AppResponse>;
	abstract mapToken(): Promise<AppResponse>;
}
