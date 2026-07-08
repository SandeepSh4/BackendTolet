import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import { AuthAbstractSqlDao } from '../abstract/auth.abstract';
import { MsSqlConstants } from '../connection/constants.mssql';
import {
	User,
	UserColumns,
	UserSession,
	UserSessionColumns,
	OwnerProfile,
	OwnerProfileColumns,
	AgentProfile,
	AgentProfileColumns
} from '../models';
import AppLogger from '@app/core/logger/app-logger';
import { AppConfigService } from '@app/config/appconfig.service';
import { LoginDto, LogoutDto, RefreshTokenDto, RegisterDto } from '@app/modules/auth/dto/auth.dto';
import { AppResponse, createResponse } from '@app/shared/appresponse.shared';
import { messages } from '@app/shared/messages.shared';
import { AtPayload, SessionMeta } from '@app/shared/models.shared';
import { RoleType } from '@app/core/enums/app-role.enum';

@Injectable()
export class AuthSqlDao implements AuthAbstractSqlDao {
	constructor(
		@Inject(MsSqlConstants.USERS) private _userModel: typeof User,
		@Inject(MsSqlConstants.USER_SESSIONS) private _sessionModel: typeof UserSession,
		@Inject(MsSqlConstants.OWNER_PROFILES) private _ownerProfileModel: typeof OwnerProfile,
		@Inject(MsSqlConstants.AGENT_PROFILES) private _agentProfileModel: typeof AgentProfile,
		readonly _loggerSvc: AppLogger,
		private readonly _jwtService: JwtService,
		private readonly _appConfigSvc: AppConfigService
	) {}

	//#region register
	async register(registerInfo: RegisterDto, meta?: SessionMeta): Promise<AppResponse> {
		try {
			if (registerInfo.role === RoleType.ADMIN) {
				return createResponse(HttpStatus.FORBIDDEN, messages.A5);
			}

			const existing = await this._userModel.findOne({
				where: { [UserColumns.Email]: registerInfo.email }
			});
			if (existing) {
				return createResponse(HttpStatus.FORBIDDEN, messages.A4);
			}

			const passwordHash = await argon2.hash(registerInfo.password);

			const user = await this._userModel.create({
				[UserColumns.Email]: registerInfo.email,
				[UserColumns.PasswordHash]: passwordHash,
				[UserColumns.FullName]: registerInfo.fullName,
				[UserColumns.Phone]: registerInfo.phone ?? null,
				[UserColumns.Role]: registerInfo.role
			} as any);

			// Create the role-specific profile. Agents start unapproved.
			if (registerInfo.role === RoleType.OWNER) {
				await this._ownerProfileModel.create({
					[OwnerProfileColumns.UserId]: user.id
				} as any);
			} else if (registerInfo.role === RoleType.AGENT) {
				await this._agentProfileModel.create({
					[AgentProfileColumns.UserId]: user.id,
					[AgentProfileColumns.IsApproved]: false
				} as any);
			}

			const tokens = await this._createSessionAndIssueTokens(user, meta);
			return createResponse(HttpStatus.CREATED, messages.A10, tokens);
		} catch (error: any) {
			this._loggerSvc.error(error, HttpStatus.INTERNAL_SERVER_ERROR);
			return createResponse(HttpStatus.INTERNAL_SERVER_ERROR, messages.E2);
		}
	}
	//#endregion

	//#region login
	async login(loginInfo: LoginDto, meta?: SessionMeta): Promise<AppResponse> {
		try {
			const user = await this._userModel.findOne({
				where: { [UserColumns.Email]: loginInfo.email }
			});
			if (!user || !user.isActive) {
				return createResponse(HttpStatus.UNAUTHORIZED, messages.A3);
			}

			const valid = await argon2.verify(user.passwordHash, loginInfo.password);
			if (!valid) {
				return createResponse(HttpStatus.UNAUTHORIZED, messages.A3);
			}

			const tokens = await this._createSessionAndIssueTokens(user, meta);
			return createResponse(HttpStatus.OK, messages.A1, tokens);
		} catch (error: any) {
			this._loggerSvc.error(error, HttpStatus.INTERNAL_SERVER_ERROR);
			return createResponse(HttpStatus.INTERNAL_SERVER_ERROR, messages.E2);
		}
	}
	//#endregion

	//#region logout
	async logout(logoutInfo: LogoutDto, claims: AtPayload): Promise<AppResponse> {
		try {
			const userId = claims?.sub ?? logoutInfo?.userId;
			if (!userId) {
				return createResponse(HttpStatus.UNAUTHORIZED, messages.E3);
			}

			// Revoke every active session for the user...
			if (logoutInfo?.allDevices) {
				await this._sessionModel.update(
					{ [UserSessionColumns.RevokedAt]: new Date() } as any,
					{ where: { [UserSessionColumns.UserId]: userId, [UserSessionColumns.RevokedAt]: null } }
				);
				return createResponse(HttpStatus.OK, messages.A12);
			}

			// ...or just the session this access token belongs to. If the token predates
			// session tracking (no sid), fall back to revoking all of the user's sessions.
			const sessionId = claims?.sid;
			if (sessionId) {
				await this._sessionModel.update(
					{ [UserSessionColumns.RevokedAt]: new Date() } as any,
					{ where: { [UserSessionColumns.Id]: sessionId, [UserSessionColumns.UserId]: userId } }
				);
			} else {
				await this._sessionModel.update(
					{ [UserSessionColumns.RevokedAt]: new Date() } as any,
					{ where: { [UserSessionColumns.UserId]: userId, [UserSessionColumns.RevokedAt]: null } }
				);
			}
			return createResponse(HttpStatus.OK, messages.A2);
		} catch (error: any) {
			this._loggerSvc.error(error, HttpStatus.INTERNAL_SERVER_ERROR, claims?.sid);
			return createResponse(HttpStatus.INTERNAL_SERVER_ERROR, messages.E2);
		}
	}
	//#endregion

	//#region refreshToken
	async refreshToken(refreshInfo: RefreshTokenDto): Promise<AppResponse> {
		try {
			const tokenMeta = this._appConfigSvc.get('tokenMetadata');
			let decoded: any;
			try {
				decoded = this._jwtService.verify(refreshInfo.refreshToken, {
					secret: tokenMeta.refreshSecret
				});
			} catch {
				return createResponse(HttpStatus.UNAUTHORIZED, messages.A8);
			}

			if (!decoded?.sid) {
				return createResponse(HttpStatus.UNAUTHORIZED, messages.A9);
			}

			const session = await this._sessionModel.findByPk(decoded.sid);
			if (!session || session.revokedAt || !session.hashedRefreshToken) {
				return createResponse(HttpStatus.UNAUTHORIZED, messages.A11);
			}

			if (session.expiresAt && session.expiresAt.getTime() < Date.now()) {
				await session.update({ [UserSessionColumns.RevokedAt]: new Date() } as any);
				return createResponse(HttpStatus.UNAUTHORIZED, messages.A11);
			}

			const matches = await argon2.verify(session.hashedRefreshToken, refreshInfo.refreshToken);
			if (!matches) {
				// Presented token does not match the stored hash — treat as reuse/theft and
				// revoke the session defensively.
				await session.update({ [UserSessionColumns.RevokedAt]: new Date() } as any);
				return createResponse(HttpStatus.UNAUTHORIZED, messages.A6);
			}

			const user = await this._userModel.findByPk(session.userId);
			if (!user || !user.isActive) {
				return createResponse(HttpStatus.UNAUTHORIZED, messages.A6);
			}

			const tokens = await this._issueTokensForSession(session, user);
			return createResponse(HttpStatus.OK, messages.A7, tokens);
		} catch (error: any) {
			this._loggerSvc.error(error, HttpStatus.INTERNAL_SERVER_ERROR);
			return createResponse(HttpStatus.INTERNAL_SERVER_ERROR, messages.E2);
		}
	}
	//#endregion

	async findUserById(userId: string): Promise<User | null> {
		return this._userModel.findByPk(userId);
	}

	//#region private helpers
	private async _createSessionAndIssueTokens(user: User, meta?: SessionMeta) {
		const session = await this._sessionModel.create({
			[UserSessionColumns.UserId]: user.id,
			[UserSessionColumns.UserAgent]: meta?.userAgent ?? null,
			[UserSessionColumns.IpAddress]: meta?.ipAddress ?? null
		} as any);
		return this._issueTokensForSession(session, user);
	}

	// Signs a fresh token pair bound to the session and (re)persists the refresh-token
	// hash and expiry. Used for both new sessions and refresh-token rotation.
	private async _issueTokensForSession(session: UserSession, user: User) {
		const tokens = await this._signTokens(user.id, user.email, user.role, session.id);
		const decoded: any = this._jwtService.decode(tokens.refreshToken);
		const hashedRefreshToken = await argon2.hash(tokens.refreshToken);
		await session.update({
			[UserSessionColumns.HashedRefreshToken]: hashedRefreshToken,
			[UserSessionColumns.ExpiresAt]: decoded?.exp ? new Date(decoded.exp * 1000) : null,
			[UserSessionColumns.RevokedAt]: null
		} as any);
		return tokens;
	}

	private async _signTokens(userId: string, email: string, role: RoleType, sid: string) {
		const tokenMeta = this._appConfigSvc.get('tokenMetadata');
		const payload = { sub: userId, email, role, sid };
		const [accessToken, refreshToken] = await Promise.all([
			this._jwtService.signAsync(payload, {
				secret: tokenMeta.accessSecret,
				expiresIn: tokenMeta.accessTtl
			}),
			this._jwtService.signAsync(payload, {
				secret: tokenMeta.refreshSecret,
				expiresIn: tokenMeta.refreshTtl
			})
		]);
		return { accessToken, refreshToken };
	}
	//#endregion
}
