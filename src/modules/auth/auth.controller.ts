import { Body, Controller, HttpCode, HttpStatus, Post, Req } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthAbstractSvc } from './auth.abstract';
import { LoginDto, LogoutDto, RefreshTokenDto, RegisterDto } from './dto/auth.dto';
import { AppResponse } from '@app/shared/appresponse.shared';
import { SessionMeta } from '@app/shared/models.shared';
import { Authorize } from '@app/core/decorators/authorization.decorator';

@Controller('auth')
@ApiTags('Authorization')
export class AuthController {
	constructor(private readonly _authService: AuthAbstractSvc) {}

	@Post('register')
	@ApiOperation({ summary: 'Register a new user' })
	async register(@Body() registerInfo: RegisterDto, @Req() req: any): Promise<AppResponse> {
		return this._authService.register(registerInfo, this._sessionMeta(req));
	}

	@HttpCode(HttpStatus.OK)
	@Post('login')
	@ApiOperation({ summary: 'Login to get access and refresh tokens' })
	async login(@Body() loginInfo: LoginDto, @Req() req: any): Promise<AppResponse> {
		return this._authService.login(loginInfo, this._sessionMeta(req));
	}

	@HttpCode(HttpStatus.OK)
	@Post('refresh')
	@ApiOperation({ summary: 'Rotate refresh token and issue a new access token' })
	async refresh(@Body() refreshInfo: RefreshTokenDto): Promise<AppResponse> {
		return this._authService.refreshToken(refreshInfo);
	}

	@Authorize()
	@HttpCode(HttpStatus.OK)
	@Post('logout')
	@ApiOperation({ summary: 'Logout the current user and revoke their refresh token' })
	async logout(@Body() logoutInfo: LogoutDto, @Req() req: any): Promise<AppResponse> {
		return this._authService.logout(logoutInfo, req.claims);
	}

	private _sessionMeta(req: any): SessionMeta {
		return {
			userAgent: req?.headers?.['user-agent'] ?? null,
			ipAddress: req?.ip ?? req?.socket?.remoteAddress ?? null
		};
	}
}
