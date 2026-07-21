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
import { Property } from './property.model';
import { Listing } from './listing.model';
import { User } from './user.model';
import { ApplicationStatus } from '@app/core/enums/domain.enum';

export enum PropertyApplicationColumns {
	Id = 'id',
	PropertyId = 'propertyId',
	SeekerId = 'seekerId',
	ListingId = 'listingId',
	Status = 'status',
	Note = 'note',
	RejectionReason = 'rejectionReason',
	ViewedAt = 'viewedAt',
	DecidedAt = 'decidedAt'
}

// A seeker's formal application for a property (distinct from an Inquiry, which
// is just a question). Carries a decision lifecycle: PENDING → ACCEPTED /
// REJECTED (by the owner) or WITHDRAWN (by the seeker). One ACTIVE
// (PENDING/ACCEPTED) application per (property, seeker) — enforced in the DAO
// and by a filtered unique index in migrations/applications.sql.
@Table({ tableName: Tables.PropertyApplications })
export class PropertyApplication extends Model<PropertyApplication> {
	@PrimaryKey
	@Default(DataType.UUIDV4)
	@Column(DataType.UUID)
	id!: string;

	@ForeignKey(() => Property)
	@Index
	@AllowNull(false)
	@Column(DataType.UUID)
	propertyId!: string;

	@BelongsTo(() => Property)
	property?: Property;

	@ForeignKey(() => User)
	@Index
	@AllowNull(false)
	@Column(DataType.UUID)
	seekerId!: string;

	@BelongsTo(() => User)
	seeker?: User;

	// Which offer the seeker is applying for (rent / sale / short-stay) — optional
	// for properties with a single offer.
	@ForeignKey(() => Listing)
	@Column(DataType.UUID)
	listingId?: string | null;

	@BelongsTo(() => Listing)
	listing?: Listing;

	@Index
	@AllowNull(false)
	@Default(ApplicationStatus.PENDING)
	@Column(DataType.ENUM(...Object.values(ApplicationStatus)))
	status!: ApplicationStatus;

	// Optional message from the seeker to the owner.
	@Column(DataType.TEXT)
	note?: string | null;

	// Optional reason captured in the owner's reject modal.
	@Column(DataType.TEXT)
	rejectionReason?: string | null;

	// Set when the owner first sees the application — surfaces as "Seen" to the seeker.
	@Column(DataType.DATE)
	viewedAt?: Date | null;

	@Column(DataType.DATE)
	decidedAt?: Date | null;
}
