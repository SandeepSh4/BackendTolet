import { Module } from '@nestjs/common';
import { AmenityController } from './amenity.controller';
import { AmenityAbstractSvc } from './amenity.abstract';
import { AmenityService } from './amenity.service';

@Module({
	controllers: [AmenityController],
	providers: [{ provide: AmenityAbstractSvc, useClass: AmenityService }]
})
export class AmenityModule {}
