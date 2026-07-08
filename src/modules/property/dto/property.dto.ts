import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString, MaxLength, Min } from 'class-validator';
import { messageFactory, messages } from '@app/shared/messages.shared';
import { AvailabilityStatus, PropertyType } from '@app/core/enums/domain.enum';

export class CreatePropertyDto {
	@ApiProperty({ example: '2 BHK near Metro' })
	@IsNotEmpty({ message: messageFactory(messages.W2, ['Title']) })
	@IsString({ message: messageFactory(messages.W1, ['Title']) })
	@MaxLength(255, { message: messageFactory(messages.W5, ['Title', '255']) })
	readonly title!: string;

	@ApiProperty({ example: 'Spacious apartment with balcony, close to the station.' })
	@IsNotEmpty({ message: messageFactory(messages.W2, ['Description']) })
	@IsString({ message: messageFactory(messages.W1, ['Description']) })
	readonly description!: string;

	@ApiProperty({ enum: PropertyType, example: PropertyType.APARTMENT })
	@IsEnum(PropertyType, { message: messageFactory(messages.W1, ['Type']) })
	readonly type!: PropertyType;

	@ApiProperty({ example: 25000 })
	@Type(() => Number)
	@IsNumber({}, { message: messageFactory(messages.W4, ['Rent amount']) })
	@Min(0, { message: messageFactory(messages.W1, ['Rent amount']) })
	readonly rentAmount!: number;

	@ApiPropertyOptional({ example: 'INR' })
	@IsOptional()
	@IsString({ message: messageFactory(messages.W1, ['Currency']) })
	readonly currency?: string;

	@ApiPropertyOptional({ example: 50000 })
	@IsOptional()
	@Type(() => Number)
	@IsNumber({}, { message: messageFactory(messages.W4, ['Deposit amount']) })
	@Min(0, { message: messageFactory(messages.W1, ['Deposit amount']) })
	readonly depositAmount?: number;

	@ApiProperty({ example: 'Mumbai', description: 'City name; resolved to a Cities master record' })
	@IsNotEmpty({ message: messageFactory(messages.W2, ['City']) })
	@IsString({ message: messageFactory(messages.W1, ['City']) })
	readonly city!: string;

	@ApiProperty({ example: '12, MG Road, Andheri West' })
	@IsNotEmpty({ message: messageFactory(messages.W2, ['Address line']) })
	@IsString({ message: messageFactory(messages.W1, ['Address line']) })
	readonly addressLine!: string;

	@ApiProperty({ example: 19.076 })
	@Type(() => Number)
	@IsNumber({}, { message: messageFactory(messages.W4, ['Latitude']) })
	readonly latitude!: number;

	@ApiProperty({ example: 72.8777 })
	@Type(() => Number)
	@IsNumber({}, { message: messageFactory(messages.W4, ['Longitude']) })
	readonly longitude!: number;

	@ApiPropertyOptional({ type: [String], example: ['WiFi', 'Parking', 'Furnished'], description: 'Amenity names; resolved to Amenities master records' })
	@IsOptional()
	@IsArray({ message: messageFactory(messages.W1, ['Amenities']) })
	@IsString({ each: true, message: messageFactory(messages.W1, ['Amenities']) })
	readonly amenities?: string[];

	@ApiPropertyOptional({ enum: AvailabilityStatus, example: AvailabilityStatus.AVAILABLE })
	@IsOptional()
	@IsEnum(AvailabilityStatus, { message: messageFactory(messages.W1, ['Availability status']) })
	readonly availabilityStatus?: AvailabilityStatus;
}

export class UpdatePropertyDto {
	@ApiPropertyOptional({ example: '2 BHK near Metro' })
	@IsOptional()
	@IsString({ message: messageFactory(messages.W1, ['Title']) })
	@MaxLength(255, { message: messageFactory(messages.W5, ['Title', '255']) })
	readonly title?: string;

	@ApiPropertyOptional({ example: 'Spacious apartment with balcony.' })
	@IsOptional()
	@IsString({ message: messageFactory(messages.W1, ['Description']) })
	readonly description?: string;

	@ApiPropertyOptional({ enum: PropertyType })
	@IsOptional()
	@IsEnum(PropertyType, { message: messageFactory(messages.W1, ['Type']) })
	readonly type?: PropertyType;

	@ApiPropertyOptional({ example: 25000 })
	@IsOptional()
	@Type(() => Number)
	@IsNumber({}, { message: messageFactory(messages.W4, ['Rent amount']) })
	@Min(0, { message: messageFactory(messages.W1, ['Rent amount']) })
	readonly rentAmount?: number;

	@ApiPropertyOptional({ example: 'INR' })
	@IsOptional()
	@IsString({ message: messageFactory(messages.W1, ['Currency']) })
	readonly currency?: string;

	@ApiPropertyOptional({ example: 50000 })
	@IsOptional()
	@Type(() => Number)
	@IsNumber({}, { message: messageFactory(messages.W4, ['Deposit amount']) })
	@Min(0, { message: messageFactory(messages.W1, ['Deposit amount']) })
	readonly depositAmount?: number;

	@ApiPropertyOptional({ example: 'Mumbai' })
	@IsOptional()
	@IsString({ message: messageFactory(messages.W1, ['City']) })
	readonly city?: string;

	@ApiPropertyOptional({ example: '12, MG Road, Andheri West' })
	@IsOptional()
	@IsString({ message: messageFactory(messages.W1, ['Address line']) })
	readonly addressLine?: string;

	@ApiPropertyOptional({ example: 19.076 })
	@IsOptional()
	@Type(() => Number)
	@IsNumber({}, { message: messageFactory(messages.W4, ['Latitude']) })
	readonly latitude?: number;

	@ApiPropertyOptional({ example: 72.8777 })
	@IsOptional()
	@Type(() => Number)
	@IsNumber({}, { message: messageFactory(messages.W4, ['Longitude']) })
	readonly longitude?: number;

	@ApiPropertyOptional({ type: [String], example: ['WiFi', 'Parking'], description: 'Replaces the full amenity set for the property' })
	@IsOptional()
	@IsArray({ message: messageFactory(messages.W1, ['Amenities']) })
	@IsString({ each: true, message: messageFactory(messages.W1, ['Amenities']) })
	readonly amenities?: string[];

	@ApiPropertyOptional({ enum: AvailabilityStatus })
	@IsOptional()
	@IsEnum(AvailabilityStatus, { message: messageFactory(messages.W1, ['Availability status']) })
	readonly availabilityStatus?: AvailabilityStatus;
}

export class SearchPropertyDto {
	@ApiPropertyOptional({ example: 'Mumbai' })
	@IsOptional()
	@IsString({ message: messageFactory(messages.W1, ['City']) })
	readonly city?: string;

	@ApiPropertyOptional({ enum: PropertyType })
	@IsOptional()
	@IsEnum(PropertyType, { message: messageFactory(messages.W1, ['Type']) })
	readonly type?: PropertyType;

	@ApiPropertyOptional({ example: 10000 })
	@IsOptional()
	@Type(() => Number)
	@IsNumber({}, { message: messageFactory(messages.W4, ['Minimum rent']) })
	@Min(0, { message: messageFactory(messages.W1, ['Minimum rent']) })
	readonly minRent?: number;

	@ApiPropertyOptional({ example: 50000 })
	@IsOptional()
	@Type(() => Number)
	@IsNumber({}, { message: messageFactory(messages.W4, ['Maximum rent']) })
	@Min(0, { message: messageFactory(messages.W1, ['Maximum rent']) })
	readonly maxRent?: number;

	@ApiPropertyOptional({ enum: AvailabilityStatus })
	@IsOptional()
	@IsEnum(AvailabilityStatus, { message: messageFactory(messages.W1, ['Availability status']) })
	readonly availabilityStatus?: AvailabilityStatus;

	@ApiPropertyOptional({ example: 1, default: 1 })
	@IsOptional()
	@Type(() => Number)
	@IsNumber({}, { message: messageFactory(messages.W4, ['Page']) })
	@Min(1, { message: messageFactory(messages.W1, ['Page']) })
	readonly page?: number;

	@ApiPropertyOptional({ example: 12, default: 12 })
	@IsOptional()
	@Type(() => Number)
	@IsNumber({}, { message: messageFactory(messages.W4, ['Page size']) })
	@Min(1, { message: messageFactory(messages.W1, ['Page size']) })
	readonly pageSize?: number;
}

// Owner "my-listings" reuses the same filter shape but is delivered in the POST body.
export class MyListingsDto extends SearchPropertyDto {}
