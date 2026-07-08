import {
	Table,
	Column,
	Model,
	DataType,
	Default,
	PrimaryKey,
	ForeignKey,
	AllowNull
} from 'sequelize-typescript';
import { Tables } from '../connection/tables.mssql';
import { Property } from './property.model';
import { Amenity } from './amenity.model';

export enum PropertyAmenityColumns {
	Id = 'id',
	PropertyId = 'propertyId',
	AmenityId = 'amenityId'
}

// Join table for the Property <-> Amenity many-to-many relationship.
@Table({
	tableName: Tables.PropertyAmenities,
	indexes: [{ unique: true, fields: ['propertyId', 'amenityId'] }]
})
export class PropertyAmenity extends Model<PropertyAmenity> {
	@PrimaryKey
	@Default(DataType.UUIDV4)
	@Column(DataType.UUID)
	id!: string;

	@ForeignKey(() => Property)
	@AllowNull(false)
	@Column(DataType.UUID)
	propertyId!: string;

	@ForeignKey(() => Amenity)
	@AllowNull(false)
	@Column(DataType.UUID)
	amenityId!: string;
}
