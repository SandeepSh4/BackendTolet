import { Module } from '@nestjs/common';
import { PropertyTypeController } from './property-type.controller';
import { PropertyTypeAbstractSvc } from './property-type.abstract';
import { PropertyTypeService } from './property-type.service';

@Module({
	controllers: [PropertyTypeController],
	providers: [{ provide: PropertyTypeAbstractSvc, useClass: PropertyTypeService }]
})
export class PropertyTypeModule {}
