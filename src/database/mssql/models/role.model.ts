import {
	Table,
	Column,
	Model,
	DataType,
	Default,
	PrimaryKey,
	AllowNull,
	HasMany
} from 'sequelize-typescript';
import { Tables } from '../connection/tables.mssql';
import { User } from './user.model';

export enum RoleColumns {
	Code = 'code',
	Name = 'name',
	Description = 'description',
	IsActive = 'isActive'
}

@Table({ tableName: Tables.Roles })
export class Role extends Model<Role> {
	// The role code (e.g. SEEKER, OWNER) is the natural primary key and matches the
	// RoleType enum used throughout the app, JWTs, and guards.
	@PrimaryKey
	@Column(DataType.STRING)
	code!: string;

	@AllowNull(false)
	@Column(DataType.STRING)
	name!: string;

	@Column(DataType.STRING)
	description?: string | null;

	@AllowNull(false)
	@Default(true)
	@Column(DataType.BOOLEAN)
	isActive!: boolean;

	@HasMany(() => User)
	users?: User[];
}
