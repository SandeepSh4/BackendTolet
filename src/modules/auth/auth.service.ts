import { Injectable } from '@nestjs/common';
import { AuthAbstractSvc } from './auth.abstract';
import { DatabaseService } from '@app/database/database.service';
import { LoginDto, LogoutDto, RefreshTokenDto, RegisterDto } from './dto/auth.dto';
import { AppResponse } from '@app/shared/appresponse.shared';
import { AtPayload, SessionMeta } from '@app/shared/models.shared';

@Injectable()
export class AuthService implements AuthAbstractSvc {
	constructor(private readonly _dbSvc: DatabaseService) {}

	async register(registerInfo: RegisterDto, meta?: SessionMeta): Promise<AppResponse> {
		return this._dbSvc.authSqlTxn.register(registerInfo, meta);
	}

	async login(loginInfo: LoginDto, meta?: SessionMeta): Promise<AppResponse> {
		return this._dbSvc.authSqlTxn.login(loginInfo, meta);
	}

	async logout(logoutInfo: LogoutDto, claims: AtPayload): Promise<AppResponse> {
		return this._dbSvc.authSqlTxn.logout(logoutInfo, claims);
	}

	async refreshToken(refreshInfo: RefreshTokenDto): Promise<AppResponse> {
		return this._dbSvc.authSqlTxn.refreshToken(refreshInfo);
	}
}
