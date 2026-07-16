import { messages } from '@app/shared/messages.shared';
import { CanActivate, ExecutionContext, HttpException, HttpStatus, Inject, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { MsSqlConstants } from '@app/database/mssql/connection/constants.mssql';
import { UserSession } from '@app/database/mssql/models';
import { DecoratorConstant } from '../constants/decorator.constant';
import AppLogger from '../logger/app-logger';

@Injectable()
export class AuthGuard implements CanActivate {
	constructor(
		private readonly reflector: Reflector,
		private readonly _logger: AppLogger,
		private readonly _jwtService: JwtService,
		@Inject(MsSqlConstants.USER_SESSIONS) private readonly _sessionModel: typeof UserSession
	) {}

	async canActivate(context: ExecutionContext): Promise<boolean> {
		try {
			const secured = this.reflector.get<string>(DecoratorConstant.SECURED, context.getHandler());

			/*If API is not secured, allow through*/
			if (!secured) {
				return true;
			}

			const request = context.switchToHttp().getRequest();
			let bearerToken = request.headers['authorization'];

			if (!bearerToken) {
				throw new HttpException(messages.E3, HttpStatus.UNAUTHORIZED);
			}

			bearerToken = bearerToken.replace('Bearer', '').trim();
			if (!bearerToken) {
				throw new HttpException(messages.E3, HttpStatus.UNAUTHORIZED);
			}

			const payload = this._jwtService.verify(bearerToken, {
				secret: process.env.JWT_ACCESS_SECRET
			});

			// Enforce session state on every request so revoked sessions (e.g. an admin
			// deactivating the user, or a "revoke device" action) take effect instantly
			// rather than lingering until the access token expires.
			if (payload?.sid) {
				const session = await this._sessionModel.findByPk(payload.sid);
				if (!session || session.revokedAt) {
					throw new HttpException(messages.E3, HttpStatus.UNAUTHORIZED);
				}
			}

			request.claims = payload;
			return true;
		} catch (error: any) {
			this._logger.error(error, HttpStatus.UNAUTHORIZED);
			throw new HttpException(messages.E3, HttpStatus.UNAUTHORIZED);
		}
	}
}
