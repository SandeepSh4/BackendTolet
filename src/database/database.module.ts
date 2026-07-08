import { Module } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { DatabaseService } from './database.service';
import { sequelizeProvider } from './mssql/connection/connection.mssql';
import { msSqlDBModelsProvider } from './mssql/connection/models.connection.mssql';
import { AuthAbstractSqlDao } from './mssql/abstract/auth.abstract';
import { AuthSqlDao } from './mssql/dao/auth.dao';
import { SessionAbstractSqlDao } from './mssql/abstract/session.abstract';
import { SessionSqlDao } from './mssql/dao/session.dao';
import { UserAbstractSqlDao } from './mssql/abstract/users.abstract';
import { UserSqlDao } from './mssql/dao/users.dao';
import { InquiryAbstractSqlDao } from './mssql/abstract/inquiry.abstract';
import { InquirySqlDao } from './mssql/dao/inquiry.dao';
import { PropertyAbstractSqlDao } from './mssql/abstract/property.abstract';
import { PropertySqlDao } from './mssql/dao/property.dao';
import { CityAbstractSqlDao } from './mssql/abstract/city.abstract';
import { CitySqlDao } from './mssql/dao/city.dao';
import { AmenityAbstractSqlDao } from './mssql/abstract/amenity.abstract';
import { AmenitySqlDao } from './mssql/dao/amenity.dao';

@Module({
	providers: [
		...sequelizeProvider,
		...msSqlDBModelsProvider,
		DatabaseService,
		JwtService,
		{ provide: AuthAbstractSqlDao, useClass: AuthSqlDao },
		{ provide: SessionAbstractSqlDao, useClass: SessionSqlDao },
		{ provide: UserAbstractSqlDao, useClass: UserSqlDao },
		{ provide: InquiryAbstractSqlDao, useClass: InquirySqlDao },
		{ provide: PropertyAbstractSqlDao, useClass: PropertySqlDao },
		{ provide: CityAbstractSqlDao, useClass: CitySqlDao },
		{ provide: AmenityAbstractSqlDao, useClass: AmenitySqlDao }
	],
	exports: [
		DatabaseService,
		...msSqlDBModelsProvider,
		{ provide: AuthAbstractSqlDao, useClass: AuthSqlDao },
		{ provide: SessionAbstractSqlDao, useClass: SessionSqlDao },
		{ provide: UserAbstractSqlDao, useClass: UserSqlDao },
		{ provide: InquiryAbstractSqlDao, useClass: InquirySqlDao },
		{ provide: PropertyAbstractSqlDao, useClass: PropertySqlDao },
		{ provide: CityAbstractSqlDao, useClass: CitySqlDao },
		{ provide: AmenityAbstractSqlDao, useClass: AmenitySqlDao }
	]
})
export class DatabaseModule { }
