import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsIn, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { messageFactory, messages } from '@app/shared/messages.shared';
import { ApplicationStatus } from '@app/core/enums/domain.enum';

export class CreateApplicationDto {
	@ApiProperty({ example: 'a1b2c3d4-…', description: 'Property being applied for' })
	@IsNotEmpty({ message: messageFactory(messages.W2, ['Property']) })
	@IsString({ message: messageFactory(messages.W1, ['Property']) })
	readonly propertyId!: string;

	@ApiPropertyOptional({ example: 'e5f6a7b8-…', description: 'Which offer (listing) — optional when the property has one offer' })
	@IsOptional()
	@IsString({ message: messageFactory(messages.W1, ['Listing']) })
	readonly listingId?: string;

	@ApiPropertyOptional({ example: 'Family of 3, need covered parking. Can move in from August.' })
	@IsOptional()
	@IsString({ message: messageFactory(messages.W1, ['Note']) })
	@MaxLength(1000, { message: messageFactory(messages.W5, ['Note', '1000']) })
	readonly note?: string;
}

export class DecideApplicationDto {
	@ApiProperty({ enum: ['ACCEPT', 'REJECT'], example: 'ACCEPT' })
	@IsIn(['ACCEPT', 'REJECT'], { message: messageFactory(messages.W1, ['Action']) })
	readonly action!: 'ACCEPT' | 'REJECT';

	@ApiPropertyOptional({ example: 'Looking for a longer lease period', description: 'Optional reason shown to the seeker on rejection' })
	@IsOptional()
	@IsString({ message: messageFactory(messages.W1, ['Reason']) })
	@MaxLength(500, { message: messageFactory(messages.W5, ['Reason', '500']) })
	readonly reason?: string;
}

export class ReceivedApplicationsDto {
	@ApiPropertyOptional({ example: 'a1b2c3d4-…', description: 'Filter to one property' })
	@IsOptional()
	@IsString({ message: messageFactory(messages.W1, ['Property']) })
	readonly propertyId?: string;

	@ApiPropertyOptional({ enum: ApplicationStatus })
	@IsOptional()
	@IsEnum(ApplicationStatus, { message: messageFactory(messages.W1, ['Status']) })
	readonly status?: ApplicationStatus;
}
