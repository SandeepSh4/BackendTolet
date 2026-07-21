import { Injectable } from '@nestjs/common';
import { AuthAbstractSqlDao } from './mssql/abstract/auth.abstract';
import { SessionAbstractSqlDao } from './mssql/abstract/session.abstract';
import { UserAbstractSqlDao } from './mssql/abstract/users.abstract';
import { InquiryAbstractSqlDao } from './mssql/abstract/inquiry.abstract';
import { PropertyAbstractSqlDao } from './mssql/abstract/property.abstract';
import { CityAbstractSqlDao } from './mssql/abstract/city.abstract';
import { AmenityAbstractSqlDao } from './mssql/abstract/amenity.abstract';
import { PropertyTypeAbstractSqlDao } from './mssql/abstract/property-type.abstract';
import { ApplicationAbstractSqlDao } from './mssql/abstract/application.abstract';
import { NotificationAbstractSqlDao } from './mssql/abstract/notification.abstract';
import { ChatAbstractSqlDao } from './mssql/abstract/chat.abstract';

@Injectable()
export class DatabaseService {
	constructor(
		public authSqlTxn: AuthAbstractSqlDao,
		public sessionSqlTxn: SessionAbstractSqlDao,
		public userSqlTxn: UserAbstractSqlDao,
		public inquirySqlTxn: InquiryAbstractSqlDao,
		public propertySqlTxn: PropertyAbstractSqlDao,
		public citySqlTxn: CityAbstractSqlDao,
		public amenitySqlTxn: AmenityAbstractSqlDao,
		public propertyTypeSqlTxn: PropertyTypeAbstractSqlDao,
		public applicationSqlTxn: ApplicationAbstractSqlDao,
		public notificationSqlTxn: NotificationAbstractSqlDao,
		public chatSqlTxn: ChatAbstractSqlDao
	) { }
}
