import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post, Query, Req } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Authorize } from '@app/core/decorators/authorization.decorator';
import { HasRoles } from '@app/core/decorators/roles.decorator';
import { RoleGroup } from '@app/core/enums/app-role.enum';
import { AppResponse } from '@app/shared/appresponse.shared';
import { PropertyAbstractSvc } from './property.abstract';
import { AttachMediaDto, CreatePropertyDto, MyListingsDto, ReorderMediaDto, SearchPropertyDto, UpdatePropertyDto } from './dto/property.dto';

@Controller('properties')
@ApiTags('Property')
export class PropertyController {
	constructor(private readonly _propertySvc: PropertyAbstractSvc) {}

	// Static routes are declared before ':id' so they are not captured by the param route.
	@Authorize()
	@Get('search')
	@ApiOperation({ summary: 'Search available properties by city, type, price range' })
	async search(@Query() filters: SearchPropertyDto): Promise<AppResponse> {
		return this._propertySvc.search(filters);
	}

	@Authorize()
	@HasRoles(RoleGroup.OWNER_ADMIN)
	@HttpCode(HttpStatus.OK)
	@Post('my-listings')
	@ApiOperation({ summary: "List the current owner's properties (filters in body)" })
	async myListings(@Body() filters: MyListingsDto, @Req() req: any): Promise<AppResponse> {
		return this._propertySvc.myListings(filters, req.claims);
	}

	@Authorize()
	@HasRoles(RoleGroup.OWNER_ADMIN)
	@Post()
	@ApiOperation({ summary: 'Create a new property listing (owner only)' })
	async create(@Body() createInfo: CreatePropertyDto, @Req() req: any): Promise<AppResponse> {
		return this._propertySvc.create(createInfo, req.claims);
	}

	@Authorize()
	@Get(':id')
	@ApiOperation({ summary: 'Get a single property with owner and media' })
	async getById(@Param('id') id: string): Promise<AppResponse> {
		return this._propertySvc.getById(id);
	}

	@Authorize()
	@Get(':id/media')
	@ApiOperation({ summary: 'List a property\'s media (ordered)' })
	async listMedia(@Param('id') id: string): Promise<AppResponse> {
		return this._propertySvc.listMedia(id);
	}

	@Authorize()
	@HasRoles(RoleGroup.OWNER_ADMIN)
	@Post(':id/media')
	@ApiOperation({ summary: 'Attach an uploaded blob to a property (owner/admin)' })
	async addMedia(@Param('id') id: string, @Body() info: AttachMediaDto, @Req() req: any): Promise<AppResponse> {
		return this._propertySvc.addMedia(id, info, req.claims);
	}

	@Authorize()
	@HasRoles(RoleGroup.OWNER_ADMIN)
	@Patch(':id/media/reorder')
	@ApiOperation({ summary: 'Reorder a property\'s media sequence (owner/admin)' })
	async reorderMedia(@Param('id') id: string, @Body() info: ReorderMediaDto, @Req() req: any): Promise<AppResponse> {
		return this._propertySvc.reorderMedia(id, info, req.claims);
	}

	@Authorize()
	@HasRoles(RoleGroup.OWNER_ADMIN)
	@Delete(':id/media/:mediaId')
	@ApiOperation({ summary: 'Delete a media item and its blob (owner/admin)' })
	async deleteMedia(@Param('id') id: string, @Param('mediaId') mediaId: string, @Req() req: any): Promise<AppResponse> {
		return this._propertySvc.deleteMedia(id, mediaId, req.claims);
	}

	@Authorize()
	@HasRoles(RoleGroup.OWNER_ADMIN)
	@Patch(':id')
	@ApiOperation({ summary: 'Update a property listing (owner only)' })
	async update(@Param('id') id: string, @Body() updateInfo: UpdatePropertyDto, @Req() req: any): Promise<AppResponse> {
		return this._propertySvc.update(id, updateInfo, req.claims);
	}

	@Authorize()
	@HasRoles(RoleGroup.OWNER_ADMIN)
	@Delete(':id')
	@ApiOperation({ summary: 'Delete a property listing (owner only)' })
	async remove(@Param('id') id: string, @Req() req: any): Promise<AppResponse> {
		return this._propertySvc.remove(id, req.claims);
	}
}
