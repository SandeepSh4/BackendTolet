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
import { Property } from './property.model';
import { User } from './user.model';
import { MediaType } from '@app/core/enums/domain.enum';

export enum PropertyMediaColumns {
	Id = 'id',
	PropertyId = 'propertyId',
	UploadedBy = 'uploadedBy',
	Type = 'type',
	BlobKey = 'blobKey',
	BlobPath = 'blobPath',
	ThumbnailKey = 'thumbnailKey',
	ContentType = 'contentType',
	SizeBytes = 'sizeBytes',
	FileName = 'fileName',
	SortOrder = 'sortOrder'
}

@Table({ tableName: Tables.PropertyMedia })
export class PropertyMedia extends Model<PropertyMedia> {
	@PrimaryKey
	@Default(DataType.UUIDV4)
	@Column(DataType.UUID)
	id!: string;

	@ForeignKey(() => Property)
	@Index
	@AllowNull(false)
	@Column(DataType.UUID)
	propertyId!: string;

	@BelongsTo(() => Property)
	property?: Property;

	@ForeignKey(() => User)
	@Column(DataType.UUID)
	uploadedBy?: string | null;

	@AllowNull(false)
	@Column(DataType.ENUM(...Object.values(MediaType)))
	type!: MediaType;

	// Public blob URL for display.
	@AllowNull(false)
	@Column(DataType.STRING)
	blobKey!: string;

	// Blob name within the container (media/<userId>/<type>/<ts>_name) — used for deletion.
	@Column(DataType.STRING)
	blobPath?: string | null;

	@Column(DataType.STRING)
	thumbnailKey?: string | null;

	@Column(DataType.STRING)
	contentType?: string | null;

	@Column(DataType.BIGINT)
	sizeBytes?: number | null;

	@Column(DataType.STRING)
	fileName?: string | null;

	// Owner-defined sequence, ordered within each media type.
	@AllowNull(false)
	@Default(0)
	@Column(DataType.INTEGER)
	sortOrder!: number;
}
