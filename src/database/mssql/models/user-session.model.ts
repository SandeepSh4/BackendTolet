import {
	Table,
	Column,
	Model,
	DataType,
	Default,
	PrimaryKey,
	ForeignKey,
	BelongsTo,
	AllowNull
} from 'sequelize-typescript';
import { Tables } from '../connection/tables.mssql';
import { User } from './user.model';

export enum UserSessionColumns {
	Id = 'id',
	UserId = 'userId',
	HashedRefreshToken = 'hashedRefreshToken',
	UserAgent = 'userAgent',
	IpAddress = 'ipAddress',
	ExpiresAt = 'expiresAt',
	RevokedAt = 'revokedAt'
}

@Table({ tableName: Tables.UserSessions })
export class UserSession extends Model<UserSession> {
	@PrimaryKey
	@Default(DataType.UUIDV4)
	@Column(DataType.UUID)
	id!: string;

	@ForeignKey(() => User)
	@AllowNull(false)
	@Column(DataType.UUID)
	userId!: string;

	@BelongsTo(() => User)
	user?: User;

	// Argon2 hash of the refresh token bound to this session. Nullable only for the
	// brief window between row creation and token issuance.
	@Column(DataType.TEXT)
	hashedRefreshToken?: string | null;

	@Column(DataType.STRING)
	userAgent?: string | null;

	@Column(DataType.STRING)
	ipAddress?: string | null;

	@Column(DataType.DATE)
	expiresAt?: Date | null;

	// Set when the session is explicitly logged out. A null value means active.
	@Column(DataType.DATE)
	revokedAt?: Date | null;
}
