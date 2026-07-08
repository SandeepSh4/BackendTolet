import { AppResponse } from '@app/shared/appresponse.shared';
import { AtPayload } from '@app/shared/models.shared';
import { CreatePropertyDto, MyListingsDto, SearchPropertyDto, UpdatePropertyDto } from '@app/modules/property/dto/property.dto';

export abstract class PropertyAbstractSqlDao {
	abstract search(filters: SearchPropertyDto): Promise<AppResponse>;
	abstract create(createInfo: CreatePropertyDto, claims: AtPayload): Promise<AppResponse>;
	abstract myListings(filters: MyListingsDto, claims: AtPayload): Promise<AppResponse>;
	abstract getById(id: string): Promise<AppResponse>;
	abstract update(id: string, updateInfo: UpdatePropertyDto, claims: AtPayload): Promise<AppResponse>;
	abstract remove(id: string, claims: AtPayload): Promise<AppResponse>;
}
