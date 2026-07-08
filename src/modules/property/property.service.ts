import { Injectable } from '@nestjs/common';
import { PropertyAbstractSvc } from './property.abstract';
import { DatabaseService } from '@app/database/database.service';
import { AppResponse } from '@app/shared/appresponse.shared';
import { AtPayload } from '@app/shared/models.shared';
import { CreatePropertyDto, MyListingsDto, SearchPropertyDto, UpdatePropertyDto } from './dto/property.dto';

@Injectable()
export class PropertyService implements PropertyAbstractSvc {
	constructor(private readonly _dbSvc: DatabaseService) {}

	async search(filters: SearchPropertyDto): Promise<AppResponse> {
		return this._dbSvc.propertySqlTxn.search(filters);
	}

	async create(createInfo: CreatePropertyDto, claims: AtPayload): Promise<AppResponse> {
		return this._dbSvc.propertySqlTxn.create(createInfo, claims);
	}

	async myListings(filters: MyListingsDto, claims: AtPayload): Promise<AppResponse> {
		return this._dbSvc.propertySqlTxn.myListings(filters, claims);
	}

	async getById(id: string): Promise<AppResponse> {
		return this._dbSvc.propertySqlTxn.getById(id);
	}

	async update(id: string, updateInfo: UpdatePropertyDto, claims: AtPayload): Promise<AppResponse> {
		return this._dbSvc.propertySqlTxn.update(id, updateInfo, claims);
	}

	async remove(id: string, claims: AtPayload): Promise<AppResponse> {
		return this._dbSvc.propertySqlTxn.remove(id, claims);
	}
}
