import { AppResponse } from '@app/shared/appresponse.shared';
import { AtPayload } from '@app/shared/models.shared';
import { GetMessagesDto, OpenConversationDto } from './dto/chat.dto';

export abstract class ChatAbstractSvc {
	abstract openConversation(info: OpenConversationDto, claims: AtPayload): Promise<AppResponse>;
	abstract myConversations(claims: AtPayload): Promise<AppResponse>;
	abstract getMessages(conversationId: string, query: GetMessagesDto, claims: AtPayload): Promise<AppResponse>;
}
