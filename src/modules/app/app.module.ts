import { CoreModule } from '@app/core/core.module';
import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthorizationModule } from '../auth/auth.module';
import { SessionModule } from '../session/session.module';
import { UserModule } from '../user/users.module';
import { InquiryModule } from '../inquiry/inquiry.module';
import { PropertyModule } from '../property/property.module';
import { CityModule } from '../city/city.module';
import { AmenityModule } from '../amenity/amenity.module';

@Module({
	imports: [CoreModule, AuthorizationModule, SessionModule, UserModule, InquiryModule, PropertyModule, CityModule, AmenityModule],
	controllers: [AppController],
	providers: [AppService]
})
export class AppModule { }
