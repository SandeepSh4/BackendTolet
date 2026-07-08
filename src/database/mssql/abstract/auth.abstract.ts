import { LoginDto, LogoutDto, RefreshTokenDto, RegisterDto } from '@app/modules/auth/dto/auth.dto';
import { AppResponse } from '@app/shared/appresponse.shared';
import { AtPayload, SessionMeta } from '@app/shared/models.shared';
import { User } from '../models';

export abstract class AuthAbstractSqlDao {
	abstract register(registerInfo: RegisterDto, meta?: SessionMeta): Promise<AppResponse>;
	abstract login(loginInfo: LoginDto, meta?: SessionMeta): Promise<AppResponse>;
	abstract logout(logoutInfo: LogoutDto, claims: AtPayload): Promise<AppResponse>;
	abstract refreshToken(refreshInfo: RefreshTokenDto): Promise<AppResponse>;
	abstract findUserById(userId: string): Promise<User | null>;
}
