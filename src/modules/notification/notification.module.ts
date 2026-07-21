import { Module } from '@nestjs/common';
import { NotificationController } from './notification.controller';
import { NotificationAbstractSvc } from './notification.abstract';
import { NotificationService } from './notification.service';

@Module({
	controllers: [NotificationController],
	providers: [{ provide: NotificationAbstractSvc, useClass: NotificationService }]
})
export class NotificationModule {}
