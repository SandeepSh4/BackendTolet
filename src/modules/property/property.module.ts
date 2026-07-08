import { Module } from '@nestjs/common';
import { PropertyController } from './property.controller';
import { PropertyAbstractSvc } from './property.abstract';
import { PropertyService } from './property.service';

@Module({
	controllers: [PropertyController],
	providers: [{ provide: PropertyAbstractSvc, useClass: PropertyService }]
})
export class PropertyModule {}
