import { Controller, Delete, Get, Param, Req } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Authorize } from '@app/core/decorators/authorization.decorator';
import { AppResponse } from '@app/shared/appresponse.shared';
import { SessionAbstractSvc } from './session.abstract';

@Controller('sessions')
@ApiTags('Session')
export class SessionController {
	constructor(private readonly _sessionSvc: SessionAbstractSvc) {}

	@Authorize()
	@Get()
	@ApiOperation({ summary: 'List the current user\'s active sessions' })
	async list(@Req() req: any): Promise<AppResponse> {
		return this._sessionSvc.listSessions(req.claims);
	}

	@Authorize()
	@Delete(':id')
	@ApiOperation({ summary: 'Revoke a specific session belonging to the current user' })
	async revoke(@Param('id') id: string, @Req() req: any): Promise<AppResponse> {
		return this._sessionSvc.revokeSession(id, req.claims);
	}
}
