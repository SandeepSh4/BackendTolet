import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
	IsArray,
	IsBoolean,
	IsEnum,
	IsIn,
	IsNotEmpty,
	IsNumber,
	IsOptional,
	IsString,
	Max,
	MaxLength,
	Min,
	ValidateIf,
	ValidateNested
} from 'class-validator';
import { messageFactory, messages } from '@app/shared/messages.shared';
import { AvailabilityStatus, ListingType, RentPeriod } from '@app/core/enums/domain.enum';

// Guest-count tier for SHORT_STAY pricing: "up to {guestsUpTo} guests → {pricePerNight}/night".
export class StayPricingTierDto {
	@ApiProperty({ example: 2, description: 'Tier applies up to this many guests' })
	@Type(() => Number)
	@IsNumber({}, { message: messageFactory(messages.W4, ['Guests up to']) })
	@Min(1, { message: messageFactory(messages.W1, ['Guests up to']) })
	readonly guestsUpTo!: number;

	@ApiProperty({ example: 2500 })
	@Type(() => Number)
	@IsNumber({}, { message: messageFactory(messages.W4, ['Price per night']) })
	@Min(0, { message: messageFactory(messages.W1, ['Price per night']) })
	readonly pricePerNight!: number;
}

// One offer on the property. The price fields that are REQUIRED depend on
// listingType (enforced via ValidateIf): SALE → salePrice, RENT → rentAmount,
// SHORT_STAY → baseNightlyPrice. The rest are optional extras for that intent.
export class CreateListingDto {
	@ApiProperty({ enum: ListingType, example: ListingType.RENT })
	@IsEnum(ListingType, { message: messageFactory(messages.W1, ['Listing type']) })
	readonly listingType!: ListingType;

	@ApiPropertyOptional({ example: 'INR' })
	@IsOptional()
	@IsString({ message: messageFactory(messages.W1, ['Currency']) })
	readonly currency?: string;

	// SALE
	@ApiPropertyOptional({ example: 7500000, description: 'Required when listingType is SALE' })
	@ValidateIf((o) => o.listingType === ListingType.SALE)
	@Type(() => Number)
	@IsNumber({}, { message: messageFactory(messages.W4, ['Sale price']) })
	@Min(0, { message: messageFactory(messages.W1, ['Sale price']) })
	readonly salePrice?: number;

	@ApiPropertyOptional({ example: true })
	@IsOptional()
	@IsBoolean({ message: messageFactory(messages.W1, ['Is negotiable']) })
	readonly isNegotiable?: boolean;

	// RENT
	@ApiPropertyOptional({ example: 25000, description: 'Required when listingType is RENT' })
	@ValidateIf((o) => o.listingType === ListingType.RENT)
	@Type(() => Number)
	@IsNumber({}, { message: messageFactory(messages.W4, ['Rent amount']) })
	@Min(0, { message: messageFactory(messages.W1, ['Rent amount']) })
	readonly rentAmount?: number;

	@ApiPropertyOptional({ enum: RentPeriod, example: RentPeriod.MONTHLY, description: 'Defaults to MONTHLY for RENT listings' })
	@IsOptional()
	@IsEnum(RentPeriod, { message: messageFactory(messages.W1, ['Rent period']) })
	readonly rentPeriod?: RentPeriod;

	@ApiPropertyOptional({ example: 50000 })
	@IsOptional()
	@Type(() => Number)
	@IsNumber({}, { message: messageFactory(messages.W4, ['Deposit amount']) })
	@Min(0, { message: messageFactory(messages.W1, ['Deposit amount']) })
	readonly depositAmount?: number;

	// SHORT_STAY
	@ApiPropertyOptional({ example: 2500, description: 'Required when listingType is SHORT_STAY' })
	@ValidateIf((o) => o.listingType === ListingType.SHORT_STAY)
	@Type(() => Number)
	@IsNumber({}, { message: messageFactory(messages.W4, ['Base nightly price']) })
	@Min(0, { message: messageFactory(messages.W1, ['Base nightly price']) })
	readonly baseNightlyPrice?: number;

	@ApiPropertyOptional({ example: 500, description: 'Per extra guest per night, beyond the last pricing tier' })
	@IsOptional()
	@Type(() => Number)
	@IsNumber({}, { message: messageFactory(messages.W4, ['Extra guest charge']) })
	@Min(0, { message: messageFactory(messages.W1, ['Extra guest charge']) })
	readonly extraGuestCharge?: number;

	@ApiPropertyOptional({ example: 6 })
	@IsOptional()
	@Type(() => Number)
	@IsNumber({}, { message: messageFactory(messages.W4, ['Max guests']) })
	@Min(1, { message: messageFactory(messages.W1, ['Max guests']) })
	readonly maxGuests?: number;

	@ApiPropertyOptional({ example: 1 })
	@IsOptional()
	@Type(() => Number)
	@IsNumber({}, { message: messageFactory(messages.W4, ['Min nights']) })
	@Min(1, { message: messageFactory(messages.W1, ['Min nights']) })
	readonly minNights?: number;

	@ApiPropertyOptional({ example: 30 })
	@IsOptional()
	@Type(() => Number)
	@IsNumber({}, { message: messageFactory(messages.W4, ['Max nights']) })
	@Min(1, { message: messageFactory(messages.W1, ['Max nights']) })
	readonly maxNights?: number;

	@ApiPropertyOptional({ type: [StayPricingTierDto], description: 'Guest-count nightly price tiers (SHORT_STAY only)' })
	@IsOptional()
	@IsArray({ message: messageFactory(messages.W1, ['Stay pricing tiers']) })
	@ValidateNested({ each: true })
	@Type(() => StayPricingTierDto)
	readonly stayPricingTiers?: StayPricingTierDto[];

	@ApiPropertyOptional({ enum: AvailabilityStatus, example: AvailabilityStatus.AVAILABLE })
	@IsOptional()
	@IsEnum(AvailabilityStatus, { message: messageFactory(messages.W1, ['Availability status']) })
	readonly availabilityStatus?: AvailabilityStatus;
}

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

	@ApiProperty({ example: 'a1b2c3d4-…', description: 'PropertyTypes master id' })
	@IsNotEmpty({ message: messageFactory(messages.W2, ['Property type']) })
	@IsString({ message: messageFactory(messages.W1, ['Property type']) })
	readonly propertyTypeId!: string;

	// Legacy headline price. Optional when `listings` are supplied — the server
	// then derives it from the first listing so existing consumers keep working.
	@ApiPropertyOptional({ example: 25000, description: 'Optional when listings are provided' })
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

	@ApiPropertyOptional({
		type: [CreateListingDto],
		description: 'The offers on this property (sale / rent / short-stay), max one per type; validated against the property type capabilities'
	})
	@IsOptional()
	@IsArray({ message: messageFactory(messages.W1, ['Listings']) })
	@ValidateNested({ each: true })
	@Type(() => CreateListingDto)
	readonly listings?: CreateListingDto[];

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

	@ApiPropertyOptional({ example: 'a1b2c3d4-…' })
	@IsOptional()
	@IsString({ message: messageFactory(messages.W1, ['Property type']) })
	readonly propertyTypeId?: string;

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

	@ApiPropertyOptional({ type: [CreateListingDto], description: 'Replaces the full listing set for the property' })
	@IsOptional()
	@IsArray({ message: messageFactory(messages.W1, ['Listings']) })
	@ValidateNested({ each: true })
	@Type(() => CreateListingDto)
	readonly listings?: CreateListingDto[];

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

	@ApiPropertyOptional({ example: 'a1b2c3d4-…' })
	@IsOptional()
	@IsString({ message: messageFactory(messages.W1, ['Property type']) })
	readonly propertyTypeId?: string;

	// Buy / rent / stay tab: only properties carrying a listing of this type match,
	// and minPrice/maxPrice apply to that intent's price column.
	@ApiPropertyOptional({ enum: ListingType, example: ListingType.RENT })
	@IsOptional()
	@IsEnum(ListingType, { message: messageFactory(messages.W1, ['Listing type']) })
	readonly listingType?: ListingType;

	@ApiPropertyOptional({ example: 10000, description: 'Per-intent price floor; requires listingType' })
	@IsOptional()
	@Type(() => Number)
	@IsNumber({}, { message: messageFactory(messages.W4, ['Minimum price']) })
	@Min(0, { message: messageFactory(messages.W1, ['Minimum price']) })
	readonly minPrice?: number;

	@ApiPropertyOptional({ example: 50000, description: 'Per-intent price ceiling; requires listingType' })
	@IsOptional()
	@Type(() => Number)
	@IsNumber({}, { message: messageFactory(messages.W4, ['Maximum price']) })
	@Min(0, { message: messageFactory(messages.W1, ['Maximum price']) })
	readonly maxPrice?: number;

	// Radius search around a point (e.g. a geocoded locality like "Hyderpara").
	// All three must be present together; results come back nearest-first with a
	// computed distanceMeters attribute.
	@ApiPropertyOptional({ example: 26.7271, description: 'Radius-search center latitude' })
	@IsOptional()
	@Type(() => Number)
	@IsNumber({}, { message: messageFactory(messages.W4, ['Latitude']) })
	@Min(-90, { message: messageFactory(messages.W1, ['Latitude']) })
	@Max(90, { message: messageFactory(messages.W1, ['Latitude']) })
	readonly latitude?: number;

	@ApiPropertyOptional({ example: 88.3953, description: 'Radius-search center longitude' })
	@IsOptional()
	@Type(() => Number)
	@IsNumber({}, { message: messageFactory(messages.W4, ['Longitude']) })
	@Min(-180, { message: messageFactory(messages.W1, ['Longitude']) })
	@Max(180, { message: messageFactory(messages.W1, ['Longitude']) })
	readonly longitude?: number;

	@ApiPropertyOptional({ example: 2, description: 'Radius in km (max 50)' })
	@IsOptional()
	@Type(() => Number)
	@IsNumber({}, { message: messageFactory(messages.W4, ['Radius']) })
	@Min(0.1, { message: messageFactory(messages.W1, ['Radius']) })
	@Max(50, { message: messageFactory(messages.W1, ['Radius']) })
	readonly radiusKm?: number;

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

export class AttachMediaDto {
	@ApiProperty({ enum: ['IMAGE', 'VIDEO'], example: 'IMAGE' })
	@IsIn(['IMAGE', 'VIDEO'])
	readonly type!: 'IMAGE' | 'VIDEO';

	@ApiProperty({ example: 'https://acct.blob.core.windows.net/tolet-media/media/…/img.jpg' })
	@IsNotEmpty()
	@IsString()
	readonly blobUrl!: string;

	@ApiProperty({ example: 'media/<userId>/image/1720440000000_img.jpg' })
	@IsNotEmpty()
	@IsString()
	readonly blobPath!: string;

	@ApiPropertyOptional({ example: 'https://…/thumb.jpg' })
	@IsOptional()
	@IsString()
	readonly thumbnailUrl?: string;

	@ApiPropertyOptional({ example: 'image/jpeg' })
	@IsOptional()
	@IsString()
	readonly contentType?: string;

	@ApiProperty({ example: 348213, description: 'File size in bytes — counts toward the user quota' })
	@Type(() => Number)
	@IsNumber()
	readonly sizeBytes!: number;

	@ApiPropertyOptional({ example: 'living-room.jpg' })
	@IsOptional()
	@IsString()
	readonly fileName?: string;
}

class ReorderMediaItem {
	@ApiProperty()
	@IsString()
	readonly mediaId!: string;

	@ApiProperty({ example: 0 })
	@Type(() => Number)
	@IsNumber()
	readonly sortOrder!: number;
}

export class ReorderMediaDto {
	@ApiProperty({ type: [ReorderMediaItem] })
	@IsArray()
	@ValidateNested({ each: true })
	@Type(() => ReorderMediaItem)
	readonly items!: ReorderMediaItem[];
}
