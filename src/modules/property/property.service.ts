import { Injectable } from '@nestjs/common';
import { PropertyAbstractSvc } from './property.abstract';
import { DatabaseService } from '@app/database/database.service';
import { AppResponse } from '@app/shared/appresponse.shared';
import { AtPayload } from '@app/shared/models.shared';
import { AttachMediaDto, CreatePropertyDto, MyListingsDto, ReorderMediaDto, SearchPropertyDto, UpdatePropertyDto } from './dto/property.dto';

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

	async getById(id: string, claims: AtPayload): Promise<AppResponse> {
		return this._dbSvc.propertySqlTxn.getById(id, claims);
	}

	async update(id: string, updateInfo: UpdatePropertyDto, claims: AtPayload): Promise<AppResponse> {
		return this._dbSvc.propertySqlTxn.update(id, updateInfo, claims);
	}

	async remove(id: string, claims: AtPayload): Promise<AppResponse> {
		return this._dbSvc.propertySqlTxn.remove(id, claims);
	}

	async listMedia(propertyId: string): Promise<AppResponse> {
		return this._dbSvc.propertySqlTxn.listMedia(propertyId);
	}

	async addMedia(propertyId: string, info: AttachMediaDto, claims: AtPayload): Promise<AppResponse> {
		return this._dbSvc.propertySqlTxn.addMedia(propertyId, info, claims);
	}

	async reorderMedia(propertyId: string, info: ReorderMediaDto, claims: AtPayload): Promise<AppResponse> {
		return this._dbSvc.propertySqlTxn.reorderMedia(propertyId, info, claims);
	}

	async deleteMedia(propertyId: string, mediaId: string, claims: AtPayload): Promise<AppResponse> {
		return this._dbSvc.propertySqlTxn.deleteMedia(propertyId, mediaId, claims);
	}
}
