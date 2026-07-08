import { Module } from '@nestjs/common';
import { SessionController } from './session.controller';
import { SessionAbstractSvc } from './session.abstract';
import { SessionService } from './session.service';

@Module({
	controllers: [SessionController],
	providers: [{ provide: SessionAbstractSvc, useClass: SessionService }]
})
export class SessionModule {}
