import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsNotEmpty, IsNumber, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import { messageFactory, messages } from '@app/shared/messages.shared';

export class SuggestPlacesDto {
	@ApiProperty({ example: 'Hyderpara, Siliguri', description: 'Free-text place / locality query' })
	@IsNotEmpty({ message: messageFactory(messages.W2, ['Query']) })
	@IsString({ message: messageFactory(messages.W1, ['Query']) })
	@MaxLength(120, { message: messageFactory(messages.W5, ['Query', '120']) })
	readonly q!: string;

	@ApiPropertyOptional({ example: 26.7271, description: 'Bias results towards this latitude' })
	@IsOptional()
	@Type(() => Number)
	@IsNumber({}, { message: messageFactory(messages.W4, ['Latitude']) })
	@Min(-90, { message: messageFactory(messages.W1, ['Latitude']) })
	@Max(90, { message: messageFactory(messages.W1, ['Latitude']) })
	readonly latitude?: number;

	@ApiPropertyOptional({ example: 88.3953, description: 'Bias results towards this longitude' })
	@IsOptional()
	@Type(() => Number)
	@IsNumber({}, { message: messageFactory(messages.W4, ['Longitude']) })
	@Min(-180, { message: messageFactory(messages.W1, ['Longitude']) })
	@Max(180, { message: messageFactory(messages.W1, ['Longitude']) })
	readonly longitude?: number;
}

export class ReverseGeocodeDto {
	@ApiProperty({ example: 26.7271 })
	@Type(() => Number)
	@IsNumber({}, { message: messageFactory(messages.W4, ['Latitude']) })
	@Min(-90, { message: messageFactory(messages.W1, ['Latitude']) })
	@Max(90, { message: messageFactory(messages.W1, ['Latitude']) })
	readonly latitude!: number;

	@ApiProperty({ example: 88.3953 })
	@Type(() => Number)
	@IsNumber({}, { message: messageFactory(messages.W4, ['Longitude']) })
	@Min(-180, { message: messageFactory(messages.W1, ['Longitude']) })
	@Max(180, { message: messageFactory(messages.W1, ['Longitude']) })
	readonly longitude!: number;
}

// Normalized suggestion shape returned to the frontend — provider-agnostic so
// Mappls can be swapped without touching the UI. Mappls autosuggest returns an
// eLoc code rather than raw coordinates (eLoc→lat/lng resolution happens in
// the map SDK client-side, since the O2G API is not part of the default plan).
export interface PlaceSuggestion {
	name: string;
	address: string;
	eLoc: string;
	latitude?: number;
	longitude?: number;
}
