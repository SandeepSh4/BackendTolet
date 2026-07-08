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

export enum CityColumns {
	Id = 'id',
	Name = 'name',
	State = 'state',
	IsActive = 'isActive'
}

@Table({ tableName: Tables.Cities })
export class City extends Model<City> {
	@PrimaryKey
	@Default(DataType.UUIDV4)
	@Column(DataType.UUID)
	id!: string;

	// Unique on the DB's default (case-insensitive) collation, so "Mumbai" and
	// "mumbai" resolve to the same row.
	@Unique
	@AllowNull(false)
	@Column(DataType.STRING)
	name!: string;

	@Column(DataType.STRING)
	state?: string | null;

	@AllowNull(false)
	@Default(true)
	@Column(DataType.BOOLEAN)
	isActive!: boolean;

	@HasMany(() => Property)
	properties?: Property[];
}
