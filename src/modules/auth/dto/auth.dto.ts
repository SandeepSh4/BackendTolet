import { RoleType } from '@app/core/enums/app-role.enum';
import { messageFactory, messages } from '@app/shared/messages.shared';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsEmail, IsEnum, IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator';

export class RegisterDto {
	@ApiProperty({ example: 'user@example.com' })
	@IsNotEmpty({ message: messageFactory(messages.W2, ['Email']) })
	@IsEmail({}, { message: messageFactory(messages.W1, ['email']) })
	readonly email!: string;

	@ApiProperty({ example: 'Password123' })
	@IsNotEmpty({ message: messageFactory(messages.W2, ['Password']) })
	@IsString()
	@MinLength(8)
	readonly password!: string;

	@ApiProperty({ example: 'Jane Doe' })
	@IsNotEmpty({ message: messageFactory(messages.W2, ['FullName']) })
	@IsString()
	@MinLength(2)
	readonly fullName!: string;

	@ApiPropertyOptional({ example: '+91-9999999999' })
	@IsOptional()
	@IsString()
	readonly phone?: string;

	// Public registration is limited to SEEKER, OWNER, and AGENT (agents pending
	// admin approval). ADMIN accounts are created out-of-band, never self-served.
	@ApiProperty({ enum: RoleType, example: RoleType.SEEKER })
	@IsEnum(RoleType)
	readonly role!: RoleType;
}

export class LoginDto {
	@ApiProperty({ example: 'user@example.com' })
	@IsNotEmpty({ message: messageFactory(messages.W2, ['Email']) })
	@IsEmail({}, { message: messageFactory(messages.W1, ['email']) })
	readonly email!: string;

	@ApiProperty({ example: 'Password123' })
	@IsNotEmpty({ message: messageFactory(messages.W2, ['Password']) })
	@IsString()
	readonly password!: string;
}

export class LogoutDto {
	@ApiPropertyOptional({ example: '75f02d9e-68f8-468b-94f0-5c4234484807' })
	@IsOptional()
	@IsString()
	readonly userId?: string;

	@ApiPropertyOptional({ example: false, description: 'Revoke every active session for the user' })
	@IsOptional()
	@IsBoolean()
	readonly allDevices?: boolean;
}

export class RefreshTokenDto {
	@ApiProperty({ example: '<refresh token>' })
	@IsNotEmpty()
	@IsString()
	readonly refreshToken!: string;
}
