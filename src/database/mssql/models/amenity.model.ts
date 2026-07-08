import {
	Table,
	Column,
	Model,
	DataType,
	Default,
	PrimaryKey,
	Unique,
	AllowNull,
	BelongsToMany
} from 'sequelize-typescript';
import { Tables } from '../connection/tables.mssql';
import { Property } from './property.model';
import { PropertyAmenity } from './property-amenity.model';

export enum AmenityColumns {
	Id = 'id',
	Name = 'name',
	IsActive = 'isActive'
}

@Table({ tableName: Tables.Amenities })
export class Amenity extends Model<Amenity> {
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

	@BelongsToMany(() => Property, () => PropertyAmenity)
	properties?: Property[];
}
