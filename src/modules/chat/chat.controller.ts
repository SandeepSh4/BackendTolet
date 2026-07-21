import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post, Query, Req } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Authorize } from '@app/core/decorators/authorization.decorator';
import { AppResponse } from '@app/shared/appresponse.shared';
import { ChatAbstractSvc } from './chat.abstract';
import { GetMessagesDto, OpenConversationDto } from './dto/chat.dto';

// REST side of chat: thread state and history (live traffic rides the socket).
@Controller('conversations')
@ApiTags('Chat')
export class ChatController {
	constructor(private readonly _chatSvc: ChatAbstractSvc) {}

	@Authorize()
	@HttpCode(HttpStatus.OK)
	@Post()
	@ApiOperation({ summary: 'Open (or return) the conversation unlocked by an accepted application' })
	async openConversation(@Body() info: OpenConversationDto, @Req() req: any): Promise<AppResponse> {
		return this._chatSvc.openConversation(info, req.claims);
	}

	@Authorize()
	@Get()
	@ApiOperation({ summary: 'My conversation threads with peer, property context and unread counts' })
	async myConversations(@Req() req: any): Promise<AppResponse> {
		return this._chatSvc.myConversations(req.claims);
	}

	@Authorize()
	@Get(':id/messages')
	@ApiOperation({ summary: 'Paginated message history (newest page first, cursor via ?before=)' })
	async getMessages(@Param('id') id: string, @Query() query: GetMessagesDto, @Req() req: any): Promise<AppResponse> {
		return this._chatSvc.getMessages(id, query, req.claims);
	}
}
