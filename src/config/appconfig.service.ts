import { Injectable } from '@nestjs/common';

@Injectable()
export class AppConfigService {
	private readonly envConfig: { [key: string]: any } = {};

	constructor() {
		/*app configurations*/
		this.envConfig.app = {
			port: parseInt(process.env.PORT ?? '3000', 10),
			environment: process.env.NODE_ENV ?? 'development',
			corsOrigins: process.env.CORS_ORIGINS ?? '',
			// Gate property applications on KYC-verified seekers. Ship OFF until the
			// KYC verification flow exists — flipping it on with no way to get
			// verified would block all applications.
			requireKycToApply: (process.env.REQUIRE_KYC_TO_APPLY ?? 'false').toLowerCase() === 'true'
		};

		/*database*/
		this.envConfig.db = {
			mssql: {
				dialect: 'mssql',
				database: process.env.DB_NAME ?? 'tolet',
				username: process.env.DB_USER ?? 'sa',
				password: process.env.DB_PASSWORD ?? '',
				host: process.env.DB_HOST ?? 'localhost',
				port: parseInt(process.env.DB_PORT ?? '1433', 10),
				dialectOptions: {
					options: {
						encrypt: true,
						trustServerCertificate: Boolean(process.env.MSSQL_TRUST_SERVER_CERTIFICATE),
						connectTimeout: 15000,
						requestTimeout: 300000
					}
				},
				pool: {
					max: 5,
					min: 0,
					acquire: 30000,
					idle: 10000
				}
			}
		};

		/*JWT / token settings*/
		this.envConfig.tokenMetadata = {
			accessSecret: process.env.JWT_ACCESS_SECRET ?? 'dev-access',
			accessTtl: process.env.JWT_ACCESS_TTL ?? '900s',
			refreshSecret: process.env.JWT_REFRESH_SECRET ?? 'dev-refresh',
			refreshTtl: process.env.JWT_REFRESH_TTL ?? '7d'
		};

		/*Blob storage (media uploads)*/
		this.envConfig.blobStorage = {
			connectionString: process.env.AZURE_STORAGE_CONNECTION_STRING ?? '',
			mediaContainer: process.env.AZURE_MEDIA_CONTAINER ?? 'tolet-media',
			sasTtlMinutes: parseInt(process.env.AZURE_MEDIA_SAS_TTL_MIN ?? '15', 10),
			// Large videos upload over minutes — give them a much longer SAS window.
			videoSasTtlMinutes: parseInt(process.env.AZURE_VIDEO_SAS_TTL_MIN ?? '120', 10),
			// Read SAS lifetime for serving private media to the browser.
			readSasTtlMinutes: parseInt(process.env.AZURE_MEDIA_READ_SAS_TTL_MIN ?? '120', 10),
			// Per-user cap across ALL their media (default 5 GB).
			userQuotaBytes: parseInt(process.env.AZURE_MEDIA_USER_QUOTA_BYTES ?? String(5 * 1024 * 1024 * 1024), 10)
		};

		/*Mappls (MapmyIndia) geocoding*/
		this.envConfig.mappls = {
			clientId: process.env.MAPPLS_CLIENT_ID ?? '',
			clientSecret: process.env.MAPPLS_CLIENT_SECRET ?? '',
			restKey: process.env.MAPPLS_REST_KEY ?? ''
		};

		/*Logger*/
		this.envConfig.logger = {
			logLevel: process.env.LOG_LEVEL ?? 'info',
			serviceName: process.env.SERVICE_NAME ?? 'tolet-backend',
			azureStorageConnectionString: process.env.AZURE_STORAGE_CONNECTION_STRING ?? '',
			azureLogContainer: process.env.AZURE_LOG_CONTAINER ?? 'app-logs'
		};
	}

	get(key: string): any {
		return this.envConfig[key];
	}
}
