import {
	Table,
	Column,
	Model,
	DataType,
	Default,
	PrimaryKey,
	ForeignKey,
	BelongsTo,
	HasMany,
	AllowNull
} from 'sequelize-typescript';
import { Tables } from '../connection/tables.mssql';
import { Message } from './message.model';
import { Property } from './property.model';

export enum ConversationColumns {
	Id = 'id',
	ParticipantA = 'participantA',
	ParticipantB = 'participantB',
	PropertyId = 'propertyId',
	LastMessageAt = 'lastMessageAt'
}

// One thread PER USER PAIR (Facebook-style). participantA/B are stored in
// canonical order (A = lexicographically lower UUID) so the unique pair index
// can never yield two threads for the same two people. Chat is unlocked only
// by an ACCEPTED application — enforced in the DAO, not here.
@Table({
	tableName: Tables.Conversations,
	indexes: [{ unique: true, fields: ['participantA', 'participantB'] }]
})
export class Conversation extends Model<Conversation> {
	@PrimaryKey
	@Default(DataType.UUIDV4)
	@Column(DataType.UUID)
	id!: string;

	@AllowNull(false)
	@Column(DataType.UUID)
	participantA!: string;

	@AllowNull(false)
	@Column(DataType.UUID)
	participantB!: string;

	// Display context: the property whose accepted application opened the thread.
	@ForeignKey(() => Property)
	@Column(DataType.UUID)
	propertyId?: string | null;

	@BelongsTo(() => Property)
	property?: Property;

	@Column(DataType.DATE)
	lastMessageAt?: Date | null;

	@HasMany(() => Message)
	messages?: Message[];
}
