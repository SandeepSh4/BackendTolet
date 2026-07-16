import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsNotEmpty, IsOptional, IsString, Min } from 'class-validator';

export class GetSasTokenDto {
	@ApiProperty({ example: 'living-room.jpg' })
	@IsNotEmpty()
	@IsString()
	readonly fileName!: string;

	@ApiProperty({ enum: ['image', 'video'], example: 'image' })
	@IsIn(['image', 'video'])
	readonly mediaType!: 'image' | 'video';

	@ApiProperty({ example: 34821312, description: 'File size in bytes — checked against the user quota' })
	@Type(() => Number)
	@IsInt()
	@Min(1)
	readonly sizeBytes!: number;

	@ApiPropertyOptional({ example: 'image/jpeg' })
	@IsOptional()
	@IsString()
	readonly contentType?: string;
}
