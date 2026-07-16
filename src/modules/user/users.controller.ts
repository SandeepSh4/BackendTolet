import { Body, Controller, Get, Param, Patch, Post, Query, Req } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserAbstractSvc } from './users.abstract';
import { AdminCreateUserDto, AdminUpdateUserDto, ListUsersQueryDto } from './dto/users.dto';
import { AppResponse } from '@app/shared/appresponse.shared';
import { Authorize } from '@app/core/decorators/authorization.decorator';
import { HasRoles } from '@app/core/decorators/roles.decorator';
import { RoleGroup } from '@app/core/enums/app-role.enum';

@Controller('users')
@ApiTags('User')
export class UserController {
	constructor(private readonly _userSvc: UserAbstractSvc) {}

	// Static routes are declared before ':id' so they are not captured by the param route.
	@Authorize()
	@Get('me')
	@ApiOperation({ summary: 'Get the authenticated user profile' })
	async me(@Req() req: any): Promise<AppResponse> {
		return this._userSvc.getProfile(req.claims.sub, req.claims);
	}

	@Authorize()
	@HasRoles(RoleGroup.ADMIN_ONLY)
	@Get('admin-ping')
	@ApiOperation({ summary: 'Admin-only ping endpoint' })
	adminPing(): { ok: boolean; scope: string } {
		return { ok: true, scope: 'admin-only' };
	}

	@Authorize()
	@HasRoles(RoleGroup.ADMIN_ONLY)
	@Get()
	@ApiOperation({ summary: 'List users (admin)' })
	async list(@Query() filters: ListUsersQueryDto): Promise<AppResponse> {
		return this._userSvc.listUsers(filters);
	}

	@Authorize()
	@HasRoles(RoleGroup.ADMIN_ONLY)
	@Post()
	@ApiOperation({ summary: 'Create a user with any role, incl. ADMIN (admin)' })
	async create(@Body() createInfo: AdminCreateUserDto, @Req() req: any): Promise<AppResponse> {
		return this._userSvc.createUser(createInfo, req.claims);
	}

	@Authorize()
	@HasRoles(RoleGroup.ADMIN_ONLY)
	@Get(':id')
	@ApiOperation({ summary: 'Get a user by id (admin)' })
	async getById(@Param('id') id: string): Promise<AppResponse> {
		return this._userSvc.getUserById(id);
	}

	@Authorize()
	@HasRoles(RoleGroup.ADMIN_ONLY)
	@Patch(':id')
	@ApiOperation({ summary: "Update a user's role, status, or profile (admin)" })
	async update(@Param('id') id: string, @Body() updateInfo: AdminUpdateUserDto, @Req() req: any): Promise<AppResponse> {
		return this._userSvc.updateUser(id, updateInfo, req.claims);
	}
}
