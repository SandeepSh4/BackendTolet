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
import { User } from './user.model';
import { City } from './city.model';
import { AssignmentStatus } from '@app/core/enums/domain.enum';

export enum AgentAssignmentColumns {
	Id = 'id',
	CustomerId = 'customerId',
	AgentId = 'agentId',
	CityId = 'cityId',
	Requirements = 'requirements',
	Status = 'status',
	AssignedAt = 'assignedAt',
	ClosedAt = 'closedAt'
}

@Table({ tableName: Tables.AgentAssignments })
export class AgentAssignment extends Model<AgentAssignment> {
	@PrimaryKey
	@Default(DataType.UUIDV4)
	@Column(DataType.UUID)
	id!: string;

	@ForeignKey(() => User)
	@AllowNull(false)
	@Column(DataType.UUID)
	customerId!: string;

	@BelongsTo(() => User, 'customerId')
	customer?: User;

	@ForeignKey(() => User)
	@Index
	@Column(DataType.UUID)
	agentId?: string | null;

	@BelongsTo(() => User, 'agentId')
	agent?: User;

	@ForeignKey(() => City)
	@AllowNull(false)
	@Column(DataType.UUID)
	cityId!: string;

	@BelongsTo(() => City)
	city?: City;

	@Column(DataType.TEXT)
	requirements?: string | null;

	@Index
	@AllowNull(false)
	@Default(AssignmentStatus.REQUESTED)
	@Column(DataType.ENUM(...Object.values(AssignmentStatus)))
	status!: AssignmentStatus;

	@Column(DataType.DATE)
	assignedAt?: Date | null;

	@Column(DataType.DATE)
	closedAt?: Date | null;
}
