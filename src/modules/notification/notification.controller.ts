import { Controller, Get, Param, Patch, Req } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Authorize } from '@app/core/decorators/authorization.decorator';
import { AppResponse } from '@app/shared/appresponse.shared';
import { NotificationAbstractSvc } from './notification.abstract';

@Controller('notifications')
@ApiTags('Notification')
export class NotificationController {
	constructor(private readonly _notificationSvc: NotificationAbstractSvc) {}

	@Authorize()
	@Get()
	@ApiOperation({ summary: 'Recent notifications for the current user' })
	async list(@Req() req: any): Promise<AppResponse> {
		return this._notificationSvc.list(req.claims);
	}

	@Authorize()
	@Get('unread-count')
	@ApiOperation({ summary: 'Unread notification count (bell badge)' })
	async unreadCount(@Req() req: any): Promise<AppResponse> {
		return this._notificationSvc.unreadCount(req.claims);
	}

	@Authorize()
	@Patch('read-all')
	@ApiOperation({ summary: 'Mark all notifications as read' })
	async markAllRead(@Req() req: any): Promise<AppResponse> {
		return this._notificationSvc.markAllRead(req.claims);
	}

	@Authorize()
	@Patch(':id/read')
	@ApiOperation({ summary: 'Mark one notification as read' })
	async markRead(@Param('id') id: string, @Req() req: any): Promise<AppResponse> {
		return this._notificationSvc.markRead(id, req.claims);
	}
}
