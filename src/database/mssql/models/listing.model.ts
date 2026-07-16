import {
	Table,
	Column,
	Model,
	DataType,
	Default,
	PrimaryKey,
	ForeignKey,
	BelongsTo,
	HasMany,
	AllowNull,
	Index
} from 'sequelize-typescript';
import { Tables } from '../connection/tables.mssql';
import { Property } from './property.model';
import { StayPricingTier } from './stay-pricing-tier.model';
import { AvailabilityStatus, ListingType, RentPeriod } from '@app/core/enums/domain.enum';

export enum ListingColumns {
	Id = 'id',
	PropertyId = 'propertyId',
	ListingType = 'listingType',
	Currency = 'currency',
	SalePrice = 'salePrice',
	IsNegotiable = 'isNegotiable',
	RentAmount = 'rentAmount',
	RentPeriod = 'rentPeriod',
	DepositAmount = 'depositAmount',
	BaseNightlyPrice = 'baseNightlyPrice',
	ExtraGuestCharge = 'extraGuestCharge',
	MaxGuests = 'maxGuests',
	MinNights = 'minNights',
	MaxNights = 'maxNights',
	AvailabilityStatus = 'availabilityStatus',
	IsApprovedByAdmin = 'isApprovedByAdmin'
}

// One OFFER on a property (the property itself stays the physical asset).
// A property may carry at most one listing per type — e.g. a SALE and a RENT
// listing simultaneously. Which types are valid is governed by the
// PropertyType capability flags (allowsSale / allowsRent / allowsShortStay).
// Price columns are nullable and interpreted per listingType:
//   SALE       → salePrice (+ isNegotiable)
//   RENT       → rentAmount + rentPeriod (+ depositAmount)
//   SHORT_STAY → baseNightlyPrice (+ extraGuestCharge, guest tiers, min/max nights)
@Table({ tableName: Tables.Listings })
export class Listing extends Model<Listing> {
	@PrimaryKey
	@Default(DataType.UUIDV4)
	@Column(DataType.UUID)
	id!: string;

	@ForeignKey(() => Property)
	@Index({ name: 'UQ_Listings_Property_Type', unique: true })
	@AllowNull(false)
	@Column(DataType.UUID)
	propertyId!: string;

	@BelongsTo(() => Property)
	property?: Property;

	@Index({ name: 'UQ_Listings_Property_Type', unique: true })
	@AllowNull(false)
	@Column(DataType.ENUM(...Object.values(ListingType)))
	listingType!: ListingType;

	@AllowNull(false)
	@Default('INR')
	@Column(DataType.STRING)
	currency!: string;

	//#region SALE
	@Column(DataType.DECIMAL(14, 2))
	salePrice?: string | null;

	@AllowNull(false)
	@Default(false)
	@Column(DataType.BOOLEAN)
	isNegotiable!: boolean;
	//#endregion

	//#region RENT
	@Column(DataType.DECIMAL(12, 2))
	rentAmount?: string | null;

	@Column(DataType.ENUM(...Object.values(RentPeriod)))
	rentPeriod?: RentPeriod | null;

	@Column(DataType.DECIMAL(12, 2))
	depositAmount?: string | null;
	//#endregion

	//#region SHORT_STAY (homestay)
	@Column(DataType.DECIMAL(12, 2))
	baseNightlyPrice?: string | null;

	// Per-extra-guest fallback when the guest count exceeds the last pricing tier.
	@Column(DataType.DECIMAL(12, 2))
	extraGuestCharge?: string | null;

	@Column(DataType.INTEGER)
	maxGuests?: number | null;

	@Column(DataType.INTEGER)
	minNights?: number | null;

	@Column(DataType.INTEGER)
	maxNights?: number | null;
	//#endregion

	// Availability and admin approval live PER LISTING: a flat can be reserved
	// for rent while its sale offer is still open.
	@Index
	@AllowNull(false)
	@Default(AvailabilityStatus.AVAILABLE)
	@Column(DataType.ENUM(...Object.values(AvailabilityStatus)))
	availabilityStatus!: AvailabilityStatus;

	@AllowNull(false)
	@Default(false)
	@Column(DataType.BOOLEAN)
	isApprovedByAdmin!: boolean;

	@HasMany(() => StayPricingTier)
	stayPricingTiers?: StayPricingTier[];
}
