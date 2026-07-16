import {
	Table,
	Column,
	Model,
	DataType,
	Default,
	PrimaryKey,
	ForeignKey,
	BelongsTo,
	AllowNull,
	Index
} from 'sequelize-typescript';
import { Tables } from '../connection/tables.mssql';
import { Listing } from './listing.model';

export enum StayPricingTierColumns {
	Id = 'id',
	ListingId = 'listingId',
	GuestsUpTo = 'guestsUpTo',
	PricePerNight = 'pricePerNight'
}

// Guest-count-based nightly pricing for SHORT_STAY listings. Tiers are read in
// ascending guestsUpTo order: "up to 2 guests → 2500, up to 4 → 4000". Guests
// beyond the last tier fall back to the listing's extraGuestCharge.
@Table({ tableName: Tables.StayPricingTiers })
export class StayPricingTier extends Model<StayPricingTier> {
	@PrimaryKey
	@Default(DataType.UUIDV4)
	@Column(DataType.UUID)
	id!: string;

	@ForeignKey(() => Listing)
	@Index({ name: 'UQ_StayPricingTiers_Listing_Guests', unique: true })
	@AllowNull(false)
	@Column(DataType.UUID)
	listingId!: string;

	@BelongsTo(() => Listing)
	listing?: Listing;

	@Index({ name: 'UQ_StayPricingTiers_Listing_Guests', unique: true })
	@AllowNull(false)
	@Column(DataType.INTEGER)
	guestsUpTo!: number;

	@AllowNull(false)
	@Column(DataType.DECIMAL(12, 2))
	pricePerNight!: string;
}
