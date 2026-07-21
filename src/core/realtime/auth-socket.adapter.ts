import { INestApplicationContext } from '@nestjs/common';
import { IoAdapter } from '@nestjs/platform-socket.io';
import { JwtService } from '@nestjs/jwt';
import { Server, ServerOptions } from 'socket.io';
import { AppConfigService } from '@app/config/appconfig.service';
import { corsOptions } from '@app/core/cors.config';
import { REALTIME_NAMESPACE } from './realtime.constants';

// Socket.IO adapter that authenticates the WebSocket HANDSHAKE: the client
// sends its access token via `auth: { token: 'Bearer …' }`, the namespace
// middleware verifies it and attaches the decoded claims to the socket, so
// gateways can trust `socket.claims` the same way controllers trust
// `req.claims`. Unauthenticated sockets never reach a gateway.
export class AuthSocketAdapter extends IoAdapter {
	private readonly _jwtService: JwtService;
	private readonly _accessSecret: string;

	constructor(app: INestApplicationContext) {
		super(app);
		// Standalone verifier — the secret is passed per-verify, so no DI wiring needed.
		this._jwtService = new JwtService({});
		this._accessSecret = app.get(AppConfigService, { strict: false }).get('tokenMetadata').accessSecret;
	}

	createIOServer(port: number, options?: ServerOptions): Server {
		const server: Server = super.createIOServer(port, {
			...options,
			// The browser connects cross-origin (UI on :3000, API on :8080) — mirror
			// the REST API's CORS policy.
			cors: { origin: corsOptions.origin as any, credentials: corsOptions.credentials }
		});

		server.of(REALTIME_NAMESPACE).use((socket: any, next) => {
			(async () => {
				const raw: string = socket.handshake?.auth?.token || socket.handshake?.headers?.authorization || '';
				const [scheme, token] = raw.split(' ');
				if (!token || scheme?.toLowerCase() !== 'bearer') {
					return next(new Error('Unauthorized'));
				}
				try {
					socket.claims = await this._jwtService.verifyAsync(token, { secret: this._accessSecret });
					next();
				} catch {
					next(new Error('Unauthorized'));
				}
			})().catch(() => next(new Error('Unauthorized')));
		});

		return server;
	}
}
