import { Module } from '@nestjs/common';
import { ChatController } from './chat.controller';
import { ChatAbstractSvc } from './chat.abstract';
import { ChatService } from './chat.service';

@Module({
	controllers: [ChatController],
	providers: [{ provide: ChatAbstractSvc, useClass: ChatService }]
})
export class ChatModule {}
