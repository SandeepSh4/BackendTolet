import {
	Table,
	Column,
	Model,
	DataType,
	Default,
	PrimaryKey,
	ForeignKey,
	BelongsTo,
	Unique,
	AllowNull,
	HasOne,
	HasMany
} from 'sequelize-typescript';
import { RoleType } from '@app/core/enums/app-role.enum';
import { KycStatus } from '@app/core/enums/domain.enum';
import { Tables } from '../connection/tables.mssql';
import { Role } from './role.model';
import { OwnerProfile } from './owner-profile.model';
import { AgentProfile } from './agent-profile.model';
import { Property } from './property.model';
import { KycVerification } from './kyc-verification.model';
import { UserSession } from './user-session.model';

export enum UserColumns {
	Id = 'id',
	Email = 'email',
	PasswordHash = 'passwordHash',
	FullName = 'fullName',
	Phone = 'phone',
	Role = 'role',
	KycStatus = 'kycStatus',
	IsActive = 'isActive',
	MediaUsedBytes = 'mediaUsedBytes'
}

@Table({ tableName: Tables.Users })
export class User extends Model<User> {
	@PrimaryKey
	@Default(DataType.UUIDV4)
	@Column(DataType.UUID)
	id!: string;

	@Unique
	@AllowNull(false)
	@Column(DataType.STRING)
	email!: string;

	@AllowNull(false)
	@Column(DataType.STRING)
	passwordHash!: string;

	@AllowNull(false)
	@Column(DataType.STRING)
	fullName!: string;

	@Column(DataType.STRING)
	phone?: string | null;

	@ForeignKey(() => Role)
	@AllowNull(false)
	@Default(RoleType.SEEKER)
	@Column(DataType.STRING)
	role!: RoleType;

	@BelongsTo(() => Role)
	roleRef?: Role;

	@AllowNull(false)
	@Default(KycStatus.NONE)
	@Column(DataType.ENUM(...Object.values(KycStatus)))
	kycStatus!: KycStatus;

	@AllowNull(false)
	@Default(true)
	@Column(DataType.BOOLEAN)
	isActive!: boolean;

	// Running total of bytes this user has uploaded across all media (quota tracking).
	@AllowNull(false)
	@Default(0)
	@Column(DataType.BIGINT)
	mediaUsedBytes!: number;

	@HasOne(() => OwnerProfile)
	ownerProfile?: OwnerProfile;

	@HasOne(() => AgentProfile)
	agentProfile?: AgentProfile;

	@HasMany(() => Property, 'ownerId')
	properties?: Property[];

	@HasMany(() => KycVerification)
	kyc?: KycVerification[];

	@HasMany(() => UserSession)
	sessions?: UserSession[];
}
