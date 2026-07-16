import { AppConfigService } from '@app/config/appconfig.service';
import AppLogger from '@app/core/logger/app-logger';
import { messageFactory, messages } from '@app/shared/messages.shared';
import { HttpStatus } from '@nestjs/common';
import { Sequelize } from 'sequelize-typescript';
import { MsSqlConstants } from './constants.mssql';
import { models } from './models.connection.mssql';
import { seedRoles, seedAmenities, seedCities, seedPropertyTypes } from './seed.mssql';

export const sequelizeProvider = [
	{
		provide: MsSqlConstants.SEQUELIZE_PROVIDER,
		useFactory: async (_appConfigSvc: AppConfigService, _logger: AppLogger) => {
			let sequelize: Sequelize | null = null;
			try {
				const dbConfig = _appConfigSvc.get('db').mssql;
				const appConfig = _appConfigSvc.get('app');
				sequelize = new Sequelize({ ...dbConfig, logging: false });
				sequelize.addModels([...models]);
				await sequelize.authenticate();

				// Auto-sync in non-production for development convenience.
				if (appConfig.environment && appConfig.environment.toLowerCase() !== 'production') {
					await sequelize.sync();
				}

				// Ensure the Roles master table is populated. Isolated so a not-yet-migrated
				// table in production cannot abort startup.
				try {
					await seedRoles();
					await seedCities();
					await seedAmenities();
					await seedPropertyTypes();
				} catch (seedErr: any) {
					_logger.log(messageFactory(messages.E4, [seedErr.stack]), HttpStatus.INTERNAL_SERVER_ERROR);
				}

				_logger.log(messages.S3, 200);
				return sequelize;
			} catch (err: any) {
				_logger.log(messageFactory(messages.E4, [err.stack]), HttpStatus.INTERNAL_SERVER_ERROR);
			} finally {
				process.on('SIGINT', async () => {
					if (sequelize) {
						try {
							await sequelize.close();
							_logger.log(messages.E5, 200);
						} catch (err: any) {
							_logger.log(messageFactory(messages.E6, [err.stack]), 500);
						} finally {
							process.exit(0);
						}
					}
				});
			}
		},
		inject: [AppConfigService, AppLogger]
	}
];
