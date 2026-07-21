import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsISO8601, IsNotEmpty, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';
import { messageFactory, messages } from '@app/shared/messages.shared';

export class OpenConversationDto {
	@ApiProperty({ example: 'a1b2c3d4-…', description: 'ACCEPTED application that unlocks this chat' })
	@IsNotEmpty({ message: messageFactory(messages.W2, ['Application']) })
	@IsString({ message: messageFactory(messages.W1, ['Application']) })
	readonly applicationId!: string;
}

export class GetMessagesDto {
	@ApiPropertyOptional({ example: '2026-07-17T10:00:00.000Z', description: 'Cursor: return messages created before this instant' })
	@IsOptional()
	@IsISO8601({}, { message: messageFactory(messages.W1, ['Before cursor']) })
	readonly before?: string;

	@ApiPropertyOptional({ example: 50, default: 50 })
	@IsOptional()
	@Type(() => Number)
	@IsNumber({}, { message: messageFactory(messages.W4, ['Limit']) })
	@Min(1, { message: messageFactory(messages.W1, ['Limit']) })
	@Max(50, { message: messageFactory(messages.W1, ['Limit']) })
	readonly limit?: number;
}
