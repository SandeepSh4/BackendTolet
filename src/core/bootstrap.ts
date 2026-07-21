import { AppConfigService } from '@app/config/appconfig.service';
import AppLogger from '@app/core/logger/app-logger';
import { ErrorHandler, ResponseHandler } from '@app/core/middleware';
import { setupSwagger } from '@app/core/swagger/doc.swagger';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import cors from 'cors';
import { corsOptions } from '@app/core/cors.config';
import { json, urlencoded } from 'express';
import helmet from 'helmet';
import { AuthSocketAdapter } from '@app/core/realtime/auth-socket.adapter';

export default function bootstrap(app: INestApplication, appConfigSvcObj: AppConfigService) {
	// Global prefix
	app.setGlobalPrefix('api');

	// Realtime: JWT-authenticated Socket.IO handshake (notifications, chat later).
	app.useWebSocketAdapter(new AuthSocketAdapter(app));

	// Express middlewares
	app.use(json({ limit: '10mb' }));
	app.use(urlencoded({ limit: '10mb', extended: true }));
	app.use(helmet());

	// CORS
	app.use(cors(corsOptions));

	// Validation pipe
	app.useGlobalPipes(
		new ValidationPipe({
			whitelist: true,
			forbidNonWhitelisted: true,
			transform: true
		})
	);

	// Interceptors
	app.useGlobalInterceptors(new ResponseHandler());

	// Error handler
	app.useGlobalFilters(new ErrorHandler(app.get(AppLogger)));

	// Swagger (non-production only)
	const appConfig = appConfigSvcObj.get('app'),
		{ environment } = appConfig;
	if (environment && environment.toLowerCase() !== 'production') {
		setupSwagger(app);
	}
}
