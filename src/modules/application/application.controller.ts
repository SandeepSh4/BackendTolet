import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Authorize } from '@app/core/decorators/authorization.decorator';
import { HasRoles } from '@app/core/decorators/roles.decorator';
import { RoleGroup } from '@app/core/enums/app-role.enum';
import { AppResponse } from '@app/shared/appresponse.shared';
import { ApplicationAbstractSvc } from './application.abstract';
import { CreateApplicationDto, DecideApplicationDto, ReceivedApplicationsDto } from './dto/application.dto';

@Controller('applications')
@ApiTags('Application')
export class ApplicationController {
	constructor(private readonly _applicationSvc: ApplicationAbstractSvc) {}

	@Authorize()
	@HasRoles(RoleGroup.SEEKER_ONLY)
	@Post()
	@ApiOperation({ summary: 'Apply for a property (seeker only)' })
	async apply(@Body() info: CreateApplicationDto, @Req() req: any): Promise<AppResponse> {
		return this._applicationSvc.apply(info, req.claims);
	}

	@Authorize()
	@Get('my')
	@ApiOperation({ summary: "The current seeker's applications (Applied tab)" })
	async myApplications(@Req() req: any): Promise<AppResponse> {
		return this._applicationSvc.myApplications(req.claims);
	}

	@Authorize()
	@HasRoles(RoleGroup.OWNER_ADMIN)
	@Get('received')
	@ApiOperation({ summary: "Applications received on the owner's properties (Seekers tab)" })
	async received(@Query() filters: ReceivedApplicationsDto, @Req() req: any): Promise<AppResponse> {
		return this._applicationSvc.received(filters, req.claims);
	}

	@Authorize()
	@HasRoles(RoleGroup.OWNER_ADMIN)
	@Patch(':id/decision')
	@ApiOperation({ summary: 'Accept or reject an application (owner/admin); reason optional on reject' })
	async decide(@Param('id') id: string, @Body() info: DecideApplicationDto, @Req() req: any): Promise<AppResponse> {
		return this._applicationSvc.decide(id, info, req.claims);
	}

	@Authorize()
	@HasRoles(RoleGroup.SEEKER_ONLY)
	@Delete(':id')
	@ApiOperation({ summary: 'Withdraw a pending application (seeker only)' })
	async withdraw(@Param('id') id: string, @Req() req: any): Promise<AppResponse> {
		return this._applicationSvc.withdraw(id, req.claims);
	}
}
