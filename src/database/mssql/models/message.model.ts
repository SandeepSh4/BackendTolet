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
import { Conversation } from './conversation.model';
import { User } from './user.model';

export enum MessageColumns {
	Id = 'id',
	ConversationId = 'conversationId',
	SenderId = 'senderId',
	Body = 'body',
	DeliveredAt = 'deliveredAt',
	ReadAt = 'readAt'
}

// Delivery ticks derive from the two timestamps: row persisted = sent (✓),
// deliveredAt = received by the peer's client (✓✓), readAt = seen (blue ✓✓).
@Table({
	tableName: Tables.Messages,
	indexes: [{ fields: ['conversationId', 'createdAt'] }]
})
export class Message extends Model<Message> {
	@PrimaryKey
	@Default(DataType.UUIDV4)
	@Column(DataType.UUID)
	id!: string;

	@ForeignKey(() => Conversation)
	@AllowNull(false)
	@Column(DataType.UUID)
	conversationId!: string;

	@BelongsTo(() => Conversation)
	conversation?: Conversation;

	@ForeignKey(() => User)
	@AllowNull(false)
	@Column(DataType.UUID)
	senderId!: string;

	@BelongsTo(() => User)
	sender?: User;

	@AllowNull(false)
	@Column(DataType.TEXT)
	body!: string;

	// Set when the recipient's client acks receipt (grey double tick).
	@Column(DataType.DATE)
	deliveredAt?: Date | null;

	// Set when the recipient views the conversation (blue double tick).
	@Column(DataType.DATE)
	readAt?: Date | null;
}
