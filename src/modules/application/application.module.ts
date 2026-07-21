import { Module } from '@nestjs/common';
import { ApplicationController } from './application.controller';
import { ApplicationAbstractSvc } from './application.abstract';
import { ApplicationService } from './application.service';

@Module({
	controllers: [ApplicationController],
	providers: [{ provide: ApplicationAbstractSvc, useClass: ApplicationService }]
})
export class ApplicationModule {}
