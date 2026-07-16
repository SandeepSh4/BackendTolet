import { AppConfigService } from '@app/config/appconfig.service';
import { DatabaseModule } from '@app/database/database.module';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { AuthGuard } from './guards/authorization.guard';
import { RolesGuard } from './guards/roles.guard';
import { BlobStorageService } from './azure/blob-storage.service';
import AppLogger from './logger/app-logger';

const getProviders = (): any[] => {
	return [
		AppConfigService,
		AppLogger,
		JwtService,
		BlobStorageService,
		{ provide: APP_GUARD, useClass: AuthGuard },
		{ provide: APP_GUARD, useClass: RolesGuard }
	];
};

const importProviders = (): any[] => {
	return [
		ConfigModule.forRoot({ envFilePath: '.env', isGlobal: true }),
		DatabaseModule
	];
};

const exportProviders = (): any[] => {
	return [AppConfigService, AppLogger, DatabaseModule, JwtService, BlobStorageService];
};

export { exportProviders, getProviders, importProviders };
