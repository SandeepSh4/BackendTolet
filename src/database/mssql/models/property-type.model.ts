import {
	Table,
	Column,
	Model,
	DataType,
	Default,
	PrimaryKey,
	Unique,
	AllowNull,
	HasMany
} from 'sequelize-typescript';
import { Tables } from '../connection/tables.mssql';
import { Property } from './property.model';

export enum PropertyTypeColumns {
	Id = 'id',
	Name = 'name',
	IsActive = 'isActive',
	SortOrder = 'sortOrder',
	AllowsSale = 'allowsSale',
	AllowsRent = 'allowsRent',
	AllowsShortStay = 'allowsShortStay'
}

// Master list of property types (1RK, Single Room, …). Admins can add rows directly
// in the DB; the frontend dropdown binds to whatever is active here.
@Table({ tableName: Tables.PropertyTypes })
export class PropertyType extends Model<PropertyType> {
	@PrimaryKey
	@Default(DataType.UUIDV4)
	@Column(DataType.UUID)
	id!: string;

	@Unique
	@AllowNull(false)
	@Column(DataType.STRING)
	name!: string;

	@AllowNull(false)
	@Default(true)
	@Column(DataType.BOOLEAN)
	isActive!: boolean;

	@AllowNull(false)
	@Default(0)
	@Column(DataType.INTEGER)
	sortOrder!: number;

	// Capability matrix: which listing intents this type supports. Drives the UI
	// (sell / rent / short-stay options after type selection) and is enforced
	// server-side when listings are attached to a property.
	@AllowNull(false)
	@Default(false)
	@Column(DataType.BOOLEAN)
	allowsSale!: boolean;

	@AllowNull(false)
	@Default(true)
	@Column(DataType.BOOLEAN)
	allowsRent!: boolean;

	@AllowNull(false)
	@Default(false)
	@Column(DataType.BOOLEAN)
	allowsShortStay!: boolean;

	@HasMany(() => Property)
	properties?: Property[];
}
