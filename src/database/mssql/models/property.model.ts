import {
	Table,
	Column,
	Model,
	DataType,
	Default,
	PrimaryKey,
	ForeignKey,
	BelongsTo,
	BelongsToMany,
	HasMany,
	AllowNull,
	Index
} from 'sequelize-typescript';
import { Tables } from '../connection/tables.mssql';
import { User } from './user.model';
import { City } from './city.model';
import { Amenity } from './amenity.model';
import { PropertyAmenity } from './property-amenity.model';
import { PropertyMedia } from './property-media.model';
import { PropertyType, AvailabilityStatus } from '@app/core/enums/domain.enum';

export enum PropertyColumns {
	Id = 'id',
	OwnerId = 'ownerId',
	Title = 'title',
	Description = 'description',
	Type = 'type',
	RentAmount = 'rentAmount',
	Currency = 'currency',
	DepositAmount = 'depositAmount',
	CityId = 'cityId',
	AddressLine = 'addressLine',
	Latitude = 'latitude',
	Longitude = 'longitude',
	AvailabilityStatus = 'availabilityStatus',
	IsApprovedByAdmin = 'isApprovedByAdmin'
}

// NOTE: the spatial `location geography` column is NOT defined here — Sequelize
// can't model SQL Server's geography type. It's added by manual migration and
// kept in sync via raw queries on insert/update.
@Table({ tableName: Tables.Properties })
export class Property extends Model<Property> {
	@PrimaryKey
	@Default(DataType.UUIDV4)
	@Column(DataType.UUID)
	id!: string;

	@ForeignKey(() => User)
	@AllowNull(false)
	@Column(DataType.UUID)
	ownerId!: string;

	@BelongsTo(() => User)
	owner?: User;

	@AllowNull(false)
	@Column(DataType.STRING)
	title!: string;

	@AllowNull(false)
	@Column(DataType.TEXT)
	description!: string;

	@AllowNull(false)
	@Column(DataType.ENUM(...Object.values(PropertyType)))
	type!: PropertyType;

	@AllowNull(false)
	@Column(DataType.DECIMAL(12, 2))
	rentAmount!: string;

	@AllowNull(false)
	@Default('INR')
	@Column(DataType.STRING)
	currency!: string;

	@Column(DataType.DECIMAL(12, 2))
	depositAmount?: string | null;

	@ForeignKey(() => City)
	@Index
	@AllowNull(false)
	@Column(DataType.UUID)
	cityId!: string;

	@BelongsTo(() => City)
	city?: City;

	@AllowNull(false)
	@Column(DataType.STRING)
	addressLine!: string;

	@AllowNull(false)
	@Column(DataType.DOUBLE)
	latitude!: number;

	@AllowNull(false)
	@Column(DataType.DOUBLE)
	longitude!: number;

	@Index
	@AllowNull(false)
	@Default(AvailabilityStatus.AVAILABLE)
	@Column(DataType.ENUM(...Object.values(AvailabilityStatus)))
	availabilityStatus!: AvailabilityStatus;

	@AllowNull(false)
	@Default(false)
	@Column(DataType.BOOLEAN)
	isApprovedByAdmin!: boolean;

	@HasMany(() => PropertyMedia)
	media?: PropertyMedia[];

	@BelongsToMany(() => Amenity, () => PropertyAmenity)
	amenities?: Amenity[];
}
