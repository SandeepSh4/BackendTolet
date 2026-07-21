import { Injectable } from '@nestjs/common';
import { ChatAbstractSvc } from './chat.abstract';
import { DatabaseService } from '@app/database/database.service';
import { AppResponse } from '@app/shared/appresponse.shared';
import { AtPayload } from '@app/shared/models.shared';
import { GetMessagesDto, OpenConversationDto } from './dto/chat.dto';

@Injectable()
export class ChatService implements ChatAbstractSvc {
	constructor(private readonly _dbSvc: DatabaseService) {}

	async openConversation(info: OpenConversationDto, claims: AtPayload): Promise<AppResponse> {
		return this._dbSvc.chatSqlTxn.openConversation(info.applicationId, claims);
	}

	async myConversations(claims: AtPayload): Promise<AppResponse> {
		return this._dbSvc.chatSqlTxn.myConversations(claims);
	}

	async getMessages(conversationId: string, query: GetMessagesDto, claims: AtPayload): Promise<AppResponse> {
		return this._dbSvc.chatSqlTxn.getMessages(conversationId, claims, query.before, query.limit);
	}
}
