import { RoleType } from '@app/core/enums/app-role.enum';
import { messageFactory, messages } from '@app/shared/messages.shared';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsBoolean, IsEmail, IsEnum, IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator';

// Admin-created users may hold ANY role, including ADMIN — this is the deliberate
// difference from public self-registration (which forbids ADMIN).
export class AdminCreateUserDto {
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

	@ApiProperty({ enum: RoleType, example: RoleType.OWNER })
	@IsEnum(RoleType)
	readonly role!: RoleType;

	@ApiPropertyOptional({ example: true, default: true })
	@IsOptional()
	@IsBoolean()
	readonly isActive?: boolean;
}

export class AdminUpdateUserDto {
	@ApiPropertyOptional({ example: 'Jane Doe' })
	@IsOptional()
	@IsString()
	@MinLength(2)
	readonly fullName?: string;

	@ApiPropertyOptional({ example: '+91-9999999999' })
	@IsOptional()
	@IsString()
	readonly phone?: string;

	@ApiPropertyOptional({ enum: RoleType })
	@IsOptional()
	@IsEnum(RoleType)
	readonly role?: RoleType;

	@ApiPropertyOptional({ example: false, description: 'Deactivate/reactivate the account' })
	@IsOptional()
	@IsBoolean()
	readonly isActive?: boolean;
}

export class ListUsersQueryDto {
	@ApiPropertyOptional({ enum: RoleType })
	@IsOptional()
	@IsEnum(RoleType)
	readonly role?: RoleType;

	@ApiPropertyOptional({ example: 'jane', description: 'Match against email or full name' })
	@IsOptional()
	@IsString()
	readonly search?: string;

	@ApiPropertyOptional({ example: 1, default: 1 })
	@IsOptional()
	@Type(() => Number)
	readonly page?: number;

	@ApiPropertyOptional({ example: 20, default: 20 })
	@IsOptional()
	@Type(() => Number)
	readonly pageSize?: number;
}
