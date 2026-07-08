import { Module } from '@nestjs/common';
import { CityController } from './city.controller';
import { CityAbstractSvc } from './city.abstract';
import { CityService } from './city.service';

@Module({
	controllers: [CityController],
	providers: [{ provide: CityAbstractSvc, useClass: CityService }]
})
export class CityModule {}
