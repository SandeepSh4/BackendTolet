import { Module } from '@nestjs/common';
import { MediaController } from './media.controller';
import { MediaAbstractSvc } from './media.abstract';
import { MediaService } from './media.service';

@Module({
	controllers: [MediaController],
	providers: [{ provide: MediaAbstractSvc, useClass: MediaService }]
})
export class MediaModule {}
