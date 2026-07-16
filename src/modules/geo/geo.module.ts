import { Module } from '@nestjs/common';
import { GeoController } from './geo.controller';
import { GeoAbstractSvc } from './geo.abstract';
import { GeoService } from './geo.service';

@Module({
	controllers: [GeoController],
	providers: [{ provide: GeoAbstractSvc, useClass: GeoService }]
})
export class GeoModule {}
