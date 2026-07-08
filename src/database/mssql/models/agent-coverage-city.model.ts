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
import { AgentProfile } from './agent-profile.model';
import { City } from './city.model';

export enum AgentCoverageCityColumns {
	Id = 'id',
	AgentId = 'agentId',
	CityId = 'cityId'
}

@Table({
	tableName: Tables.AgentCoverageCities,
	indexes: [{ unique: true, fields: ['agentId', 'cityId'] }]
})
export class AgentCoverageCity extends Model<AgentCoverageCity> {
	@PrimaryKey
	@Default(DataType.UUIDV4)
	@Column(DataType.UUID)
	id!: string;

	@ForeignKey(() => AgentProfile)
	@AllowNull(false)
	@Column(DataType.UUID)
	agentId!: string;

	@BelongsTo(() => AgentProfile)
	agent?: AgentProfile;

	@ForeignKey(() => City)
	@Index
	@AllowNull(false)
	@Column(DataType.UUID)
	cityId!: string;

	@BelongsTo(() => City)
	city?: City;
}
