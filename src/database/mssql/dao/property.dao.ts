import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import { literal, Op, Transaction, WhereOptions } from 'sequelize';
import { PropertyAbstractSqlDao } from '../abstract/property.abstract';
import { MsSqlConstants } from '../connection/constants.mssql';
import {
	Property,
	PropertyColumns,
	PropertyMedia,
	PropertyMediaColumns,
	City,
	CityColumns,
	Amenity,
	AmenityColumns,
	PropertyType,
	PropertyTypeColumns,
	Listing,
	ListingColumns,
	StayPricingTier,
	StayPricingTierColumns,
	PropertyApplication,
	PropertyApplicationColumns,
	User,
	UserColumns
} from '../models';
import AppLogger from '@app/core/logger/app-logger';
import { AppConfigService } from '@app/config/appconfig.service';
import { AppResponse, createResponse } from '@app/shared/appresponse.shared';
import { messageFactory, messages } from '@app/shared/messages.shared';
import { AtPayload } from '@app/shared/models.shared';
import { ApplicationStatus, AvailabilityStatus, ListingType, MediaType, RentPeriod } from '@app/core/enums/domain.enum';
import { RoleType } from '@app/core/enums/app-role.enum';
import { BlobStorageService } from '@app/core/azure/blob-storage.service';
import {
	AttachMediaDto,
	CreateListingDto,
	CreatePropertyDto,
	MyListingsDto,
	ReorderMediaDto,
	SearchPropertyDto,
	UpdatePropertyDto
} from '@app/modules/property/dto/property.dto';

const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 12;

@Injectable()
export class PropertySqlDao implements PropertyAbstractSqlDao {
	constructor(
		@Inject(MsSqlConstants.PROPERTIES) private _propertyModel: typeof Property,
		@Inject(MsSqlConstants.PROPERTY_MEDIA) private _propertyMediaModel: typeof PropertyMedia,
		@Inject(MsSqlConstants.CITIES) private _cityModel: typeof City,
		@Inject(MsSqlConstants.AMENITIES) private _amenityModel: typeof Amenity,
		@Inject(MsSqlConstants.PROPERTY_TYPES) private _propertyTypeModel: typeof PropertyType,
		@Inject(MsSqlConstants.LISTINGS) private _listingModel: typeof Listing,
		@Inject(MsSqlConstants.STAY_PRICING_TIERS) private _stayTierModel: typeof StayPricingTier,
		@Inject(MsSqlConstants.PROPERTY_APPLICATIONS) private _applicationModel: typeof PropertyApplication,
		@Inject(MsSqlConstants.USERS) private _userModel: typeof User,
		readonly _loggerSvc: AppLogger,
		private readonly _blobSvc: BlobStorageService,
		private readonly _appConfigSvc: AppConfigService
	) {}

	async search(filters: SearchPropertyDto): Promise<AppResponse> {
		try {
			// Seeker-facing: default to AVAILABLE when no status is passed. No approval gate.
			const where = this._buildFilterWhere(filters);
			if (!filters.availabilityStatus) {
				where[PropertyColumns.AvailabilityStatus] = AvailabilityStatus.AVAILABLE;
			}
			if (!(await this._applyCityFilter(where, filters.city))) {
				return this._emptyPage(filters.page, filters.pageSize);
			}
			// Buy/rent/stay tab: only offers of that type, AVAILABLE unless overridden.
			const listingWhere = this._buildListingWhere(filters, filters.availabilityStatus ?? AvailabilityStatus.AVAILABLE);
			return this._paginatedFind(where, filters.page, filters.pageSize, listingWhere, this._buildGeoFilter(filters));
		} catch (error: any) {
			this._loggerSvc.error(error, HttpStatus.INTERNAL_SERVER_ERROR);
			return createResponse(HttpStatus.INTERNAL_SERVER_ERROR, messages.E2);
		}
	}

	async myListings(filters: MyListingsDto, claims: AtPayload): Promise<AppResponse> {
		try {
			// Owner-scoped: show all of their properties regardless of availability.
			const where = this._buildFilterWhere(filters);
			where[PropertyColumns.OwnerId] = claims.sub;
			if (!(await this._applyCityFilter(where, filters.city))) {
				return this._emptyPage(filters.page, filters.pageSize);
			}
			const response = await this._paginatedFind(where, filters.page, filters.pageSize, this._buildListingWhere(filters));
			await this._attachPendingApplicationCounts(response);
			return response;
		} catch (error: any) {
			this._loggerSvc.error(error, HttpStatus.INTERNAL_SERVER_ERROR, claims?.sid);
			return createResponse(HttpStatus.INTERNAL_SERVER_ERROR, messages.E2);
		}
	}

	// Decorates my-listings items with the number of PENDING applications so the
	// owner sees "N applied" per property.
	private async _attachPendingApplicationCounts(response: AppResponse): Promise<void> {
		const items: any[] = (response as any)?.data?.items ?? [];
		if (!items.length) return;
		const counts = (await this._applicationModel.findAll({
			where: {
				[PropertyApplicationColumns.PropertyId]: { [Op.in]: items.map((i) => i.id) },
				[PropertyApplicationColumns.Status]: ApplicationStatus.PENDING
			},
			attributes: [
				PropertyApplicationColumns.PropertyId,
				[literal('COUNT(*)'), 'pending']
			],
			group: [PropertyApplicationColumns.PropertyId],
			raw: true
		})) as any[];
		const byProperty = new Map(counts.map((c) => [c.propertyId, Number(c.pending)]));
		items.forEach((item) => {
			item.pendingApplications = byProperty.get(item.id) ?? 0;
		});
	}

	async create(createInfo: CreatePropertyDto, claims: AtPayload): Promise<AppResponse> {
		const transaction = await this._sequelize.transaction();
		try {
			const listings = createInfo.listings ?? [];
			const invalid = await this._validateListings(listings, createInfo.propertyTypeId, transaction);
			if (invalid) {
				await transaction.rollback();
				return invalid;
			}

			// Legacy headline price: taken from the payload, else derived from the
			// listings so older clients and the existing NOT NULL column keep working.
			const headlineRent = this._deriveHeadlineRent(createInfo);
			if (headlineRent === undefined) {
				await transaction.rollback();
				return createResponse(HttpStatus.BAD_REQUEST, messages.L3);
			}

			const cityId = await this._resolveCityId(createInfo.city, transaction);

			const property = await this._propertyModel.create(
				{
					[PropertyColumns.OwnerId]: claims.sub,
					[PropertyColumns.Title]: createInfo.title,
					[PropertyColumns.Description]: createInfo.description,
					[PropertyColumns.PropertyTypeId]: createInfo.propertyTypeId,
					[PropertyColumns.RentAmount]: headlineRent,
					[PropertyColumns.Currency]: createInfo.currency ?? 'INR',
					[PropertyColumns.DepositAmount]: createInfo.depositAmount ?? null,
					[PropertyColumns.CityId]: cityId,
					[PropertyColumns.AddressLine]: createInfo.addressLine,
					[PropertyColumns.Latitude]: createInfo.latitude,
					[PropertyColumns.Longitude]: createInfo.longitude,
					[PropertyColumns.AvailabilityStatus]: createInfo.availabilityStatus ?? AvailabilityStatus.AVAILABLE
				} as any,
				{ transaction }
			);

			if (createInfo.amenities?.length) {
				const amenityIds = await this._resolveAmenityIds(createInfo.amenities, transaction);
				await property.$set('amenities', amenityIds, { transaction });
			}

			await this._createListings(property.id, listings, createInfo.currency, transaction);

			// Keep the spatial `location` column (used by radius search) in sync.
			await this._syncLocation(property.id, createInfo.latitude, createInfo.longitude, transaction);

			await transaction.commit();
			const full = await this._findFull(property.id);
			return createResponse(HttpStatus.CREATED, messages.P1, await this._serializeProperty(full));
		} catch (error: any) {
			await transaction.rollback();
			this._loggerSvc.error(error, HttpStatus.INTERNAL_SERVER_ERROR, claims?.sid);
			return createResponse(HttpStatus.INTERNAL_SERVER_ERROR, messages.E2);
		}
	}

	async getById(id: string, claims: AtPayload): Promise<AppResponse> {
		try {
			const property = await this._findFull(id);
			if (!property) {
				return createResponse(HttpStatus.NOT_FOUND, messages.P5);
			}
			const json = await this._serializeProperty(property);

			// Contact gating: the owner's phone/email are private until the viewer's
			// application is ACCEPTED (the owner and admins always see them).
			const isOwnerOrAdmin = claims && (property.ownerId === claims.sub || claims.role === RoleType.ADMIN);
			let contactUnlocked = Boolean(isOwnerOrAdmin);
			if (!contactUnlocked && claims?.sub) {
				const accepted = await this._applicationModel.findOne({
					where: {
						[PropertyApplicationColumns.PropertyId]: id,
						[PropertyApplicationColumns.SeekerId]: claims.sub,
						[PropertyApplicationColumns.Status]: ApplicationStatus.ACCEPTED
					},
					attributes: [PropertyApplicationColumns.Id]
				});
				contactUnlocked = Boolean(accepted);
			}
			if (!contactUnlocked && json.owner) {
				delete json.owner.phone;
				delete json.owner.email;
			}
			json.contactUnlocked = contactUnlocked;

			return createResponse(HttpStatus.OK, messages.P2, json);
		} catch (error: any) {
			this._loggerSvc.error(error, HttpStatus.INTERNAL_SERVER_ERROR);
			return createResponse(HttpStatus.INTERNAL_SERVER_ERROR, messages.E2);
		}
	}

	async update(id: string, updateInfo: UpdatePropertyDto, claims: AtPayload): Promise<AppResponse> {
		const transaction = await this._sequelize.transaction();
		try {
			const property = await this._propertyModel.findByPk(id, { transaction });
			if (!property) {
				await transaction.rollback();
				return createResponse(HttpStatus.NOT_FOUND, messages.P5);
			}
			// Owners may only edit their own; admins may edit any.
			if (property.ownerId !== claims.sub && claims.role !== RoleType.ADMIN) {
				await transaction.rollback();
				return createResponse(HttpStatus.FORBIDDEN, messages.E7.replace('{0}', 'update this property'));
			}

			// `city`, `amenities` and `listings` are not direct columns — handle them separately.
			const { city, amenities, listings, ...columns } = updateInfo;

			if (listings !== undefined) {
				const typeId = columns.propertyTypeId ?? property.propertyTypeId;
				const invalid = await this._validateListings(listings, typeId, transaction);
				if (invalid) {
					await transaction.rollback();
					return invalid;
				}
			}

			const patch: Record<string, any> = { ...columns };
			if (city !== undefined) {
				patch[PropertyColumns.CityId] = await this._resolveCityId(city, transaction);
			}
			await property.update(patch, { transaction });

			if (amenities !== undefined) {
				const amenityIds = await this._resolveAmenityIds(amenities, transaction);
				await property.$set('amenities', amenityIds, { transaction });
			}

			// Replace-all listing semantics, mirroring how amenities are updated.
			if (listings !== undefined) {
				await this._destroyListings(id, transaction);
				await this._createListings(id, listings, updateInfo.currency ?? property.currency, transaction);
			}

			// Re-sync the spatial column when the pin moved.
			if (columns.latitude !== undefined || columns.longitude !== undefined) {
				await this._syncLocation(id, property.latitude, property.longitude, transaction);
			}

			await transaction.commit();
			const full = await this._findFull(id);
			return createResponse(HttpStatus.OK, messages.P3, await this._serializeProperty(full));
		} catch (error: any) {
			await transaction.rollback();
			this._loggerSvc.error(error, HttpStatus.INTERNAL_SERVER_ERROR, claims?.sid);
			return createResponse(HttpStatus.INTERNAL_SERVER_ERROR, messages.E2);
		}
	}

	async remove(id: string, claims: AtPayload): Promise<AppResponse> {
		try {
			const property = await this._propertyModel.findByPk(id);
			if (!property) {
				return createResponse(HttpStatus.NOT_FOUND, messages.P5);
			}
			// Owners may only delete their own; admins may delete any.
			if (property.ownerId !== claims.sub && claims.role !== RoleType.ADMIN) {
				return createResponse(HttpStatus.FORBIDDEN, messages.E7.replace('{0}', 'delete this property'));
			}

			// Clean up the property's media first: remove blobs, refund quota, drop rows
			// (also avoids the PropertyMedia FK blocking the delete).
			const mediaRows = await this._propertyMediaModel.findAll({
				where: { [PropertyMediaColumns.PropertyId]: id }
			});
			for (const m of mediaRows) {
				if (m.blobPath) {
					try {
						await this._blobSvc.deleteBlob(m.blobPath);
					} catch {
						/* best effort */
					}
				}
				const owner = m.uploadedBy ?? property.ownerId;
				const freed = Number(m.sizeBytes ?? 0);
				if (owner && freed > 0) await this._adjustUsage(owner, -freed);
			}
			await this._propertyMediaModel.destroy({ where: { [PropertyMediaColumns.PropertyId]: id } });

			// Listings (and their stay-pricing tiers) go with the property.
			await this._destroyListings(id);

			// Applications too — done explicitly so the delete never depends on how
			// the FK was created (sync() defaults to NO ACTION, blocking the delete).
			await this._applicationModel.destroy({ where: { [PropertyApplicationColumns.PropertyId]: id } });

			await property.destroy();
			return createResponse(HttpStatus.OK, messages.P4);
		} catch (error: any) {
			this._loggerSvc.error(error, HttpStatus.INTERNAL_SERVER_ERROR, claims?.sid);
			return createResponse(HttpStatus.INTERNAL_SERVER_ERROR, messages.E2);
		}
	}

	//#region media management
	async listMedia(propertyId: string): Promise<AppResponse> {
		try {
			const media = await this._propertyMediaModel.findAll({
				where: { [PropertyMediaColumns.PropertyId]: propertyId },
				order: [
					[PropertyMediaColumns.Type, 'ASC'],
					[PropertyMediaColumns.SortOrder, 'ASC']
				]
			});
			return createResponse(HttpStatus.OK, messages.P2, await this._withMediaSas(media.map((m) => m.toJSON())));
		} catch (error: any) {
			this._loggerSvc.error(error, HttpStatus.INTERNAL_SERVER_ERROR);
			return createResponse(HttpStatus.INTERNAL_SERVER_ERROR, messages.E2);
		}
	}

	async addMedia(propertyId: string, info: AttachMediaDto, claims: AtPayload): Promise<AppResponse> {
		try {
			const property = await this._propertyModel.findByPk(propertyId);
			if (!property) {
				return createResponse(HttpStatus.NOT_FOUND, messages.P5);
			}
			if (!this._canManage(property, claims)) {
				return createResponse(HttpStatus.FORBIDDEN, messages.E7.replace('{0}', "manage this property's media"));
			}

			// Hard quota gate: the blob is already uploaded, so if it would exceed the
			// user's cap we reject and remove the now-orphaned blob.
			const size = Number(info.sizeBytes ?? 0);
			const { userQuotaBytes } = this._appConfigSvc.get('blobStorage');
			const used = await this._getMediaUsage(claims.sub);
			if (used + size > userQuotaBytes) {
				try {
					await this._blobSvc.deleteBlob(info.blobPath);
				} catch {
					/* best effort */
				}
				return createResponse(HttpStatus.PAYLOAD_TOO_LARGE, messages.MED2, { usedBytes: used, quotaBytes: userQuotaBytes });
			}

			// New item goes to the end of its type's sequence.
			const maxOrder = (await this._propertyMediaModel.max(PropertyMediaColumns.SortOrder, {
				where: { [PropertyMediaColumns.PropertyId]: propertyId, [PropertyMediaColumns.Type]: info.type }
			})) as number | null;

			const media = await this._propertyMediaModel.create({
				[PropertyMediaColumns.PropertyId]: propertyId,
				[PropertyMediaColumns.UploadedBy]: claims.sub,
				[PropertyMediaColumns.Type]: info.type as MediaType,
				[PropertyMediaColumns.BlobKey]: info.blobUrl,
				[PropertyMediaColumns.BlobPath]: info.blobPath,
				[PropertyMediaColumns.ThumbnailKey]: info.thumbnailUrl ?? null,
				[PropertyMediaColumns.ContentType]: info.contentType ?? null,
				[PropertyMediaColumns.SizeBytes]: info.sizeBytes ?? null,
				[PropertyMediaColumns.FileName]: info.fileName ?? null,
				[PropertyMediaColumns.SortOrder]: (maxOrder ?? -1) + 1
			} as any);

			await this._adjustUsage(claims.sub, size);
			return createResponse(HttpStatus.CREATED, messages.PM1, media);
		} catch (error: any) {
			this._loggerSvc.error(error, HttpStatus.INTERNAL_SERVER_ERROR, claims?.sid);
			return createResponse(HttpStatus.INTERNAL_SERVER_ERROR, messages.E2);
		}
	}

	async reorderMedia(propertyId: string, info: ReorderMediaDto, claims: AtPayload): Promise<AppResponse> {
		try {
			const property = await this._propertyModel.findByPk(propertyId);
			if (!property) {
				return createResponse(HttpStatus.NOT_FOUND, messages.P5);
			}
			if (!this._canManage(property, claims)) {
				return createResponse(HttpStatus.FORBIDDEN, messages.E7.replace('{0}', "manage this property's media"));
			}

			await Promise.all(
				info.items.map((item) =>
					this._propertyMediaModel.update(
						{ [PropertyMediaColumns.SortOrder]: item.sortOrder } as any,
						{ where: { [PropertyMediaColumns.Id]: item.mediaId, [PropertyMediaColumns.PropertyId]: propertyId } }
					)
				)
			);

			return createResponse(HttpStatus.OK, messages.PM2);
		} catch (error: any) {
			this._loggerSvc.error(error, HttpStatus.INTERNAL_SERVER_ERROR, claims?.sid);
			return createResponse(HttpStatus.INTERNAL_SERVER_ERROR, messages.E2);
		}
	}

	async deleteMedia(propertyId: string, mediaId: string, claims: AtPayload): Promise<AppResponse> {
		try {
			const property = await this._propertyModel.findByPk(propertyId);
			if (!property) {
				return createResponse(HttpStatus.NOT_FOUND, messages.P5);
			}
			if (!this._canManage(property, claims)) {
				return createResponse(HttpStatus.FORBIDDEN, messages.E7.replace('{0}', "manage this property's media"));
			}

			const media = await this._propertyMediaModel.findOne({
				where: { [PropertyMediaColumns.Id]: mediaId, [PropertyMediaColumns.PropertyId]: propertyId }
			});
			if (!media) {
				return createResponse(HttpStatus.NOT_FOUND, messages.PM4);
			}

			// Best-effort blob removal — a storage failure shouldn't block the DB delete.
			if (media.blobPath) {
				try {
					await this._blobSvc.deleteBlob(media.blobPath);
				} catch (blobErr: any) {
					this._loggerSvc.error(blobErr, HttpStatus.INTERNAL_SERVER_ERROR, claims?.sid);
				}
			}

			const freed = Number(media.sizeBytes ?? 0);
			const owner = media.uploadedBy ?? property.ownerId;
			await media.destroy();
			if (owner && freed > 0) await this._adjustUsage(owner, -freed);
			return createResponse(HttpStatus.OK, messages.PM3);
		} catch (error: any) {
			this._loggerSvc.error(error, HttpStatus.INTERNAL_SERVER_ERROR, claims?.sid);
			return createResponse(HttpStatus.INTERNAL_SERVER_ERROR, messages.E2);
		}
	}
	//#endregion

	//#region listing helpers
	// Rejects duplicate listing types and listing intents the property type does
	// not support (per the PropertyTypes capability matrix). Returns an error
	// response to short-circuit with, or null when everything is valid.
	private async _validateListings(
		listings: CreateListingDto[],
		propertyTypeId: string,
		transaction?: Transaction
	): Promise<AppResponse | null> {
		if (!listings.length) return null;

		const seen = new Set<string>();
		for (const listing of listings) {
			if (seen.has(listing.listingType)) {
				return createResponse(HttpStatus.BAD_REQUEST, messageFactory(messages.L2, [listing.listingType]));
			}
			seen.add(listing.listingType);
		}

		const propertyType = await this._propertyTypeModel.findByPk(propertyTypeId, { transaction });
		const capabilities: Record<ListingType, boolean> = {
			[ListingType.SALE]: propertyType?.allowsSale ?? false,
			[ListingType.RENT]: propertyType?.allowsRent ?? false,
			[ListingType.SHORT_STAY]: propertyType?.allowsShortStay ?? false
		};
		for (const listing of listings) {
			if (!capabilities[listing.listingType]) {
				return createResponse(
					HttpStatus.BAD_REQUEST,
					messageFactory(messages.L1, [listing.listingType, propertyType?.name ?? propertyTypeId])
				);
			}
		}
		return null;
	}

	private async _createListings(
		propertyId: string,
		listings: CreateListingDto[],
		currencyFallback: string | undefined,
		transaction: Transaction
	): Promise<void> {
		for (const info of listings) {
			const listing = await this._listingModel.create(
				{
					[ListingColumns.PropertyId]: propertyId,
					[ListingColumns.ListingType]: info.listingType,
					[ListingColumns.Currency]: info.currency ?? currencyFallback ?? 'INR',
					[ListingColumns.SalePrice]: info.salePrice ?? null,
					[ListingColumns.IsNegotiable]: info.isNegotiable ?? false,
					[ListingColumns.RentAmount]: info.rentAmount ?? null,
					[ListingColumns.RentPeriod]:
						info.listingType === ListingType.RENT ? (info.rentPeriod ?? RentPeriod.MONTHLY) : null,
					[ListingColumns.DepositAmount]: info.depositAmount ?? null,
					[ListingColumns.BaseNightlyPrice]: info.baseNightlyPrice ?? null,
					[ListingColumns.ExtraGuestCharge]: info.extraGuestCharge ?? null,
					[ListingColumns.MaxGuests]: info.maxGuests ?? null,
					[ListingColumns.MinNights]: info.minNights ?? null,
					[ListingColumns.MaxNights]: info.maxNights ?? null,
					[ListingColumns.AvailabilityStatus]: info.availabilityStatus ?? AvailabilityStatus.AVAILABLE
				} as any,
				{ transaction }
			);

			if (info.listingType === ListingType.SHORT_STAY && info.stayPricingTiers?.length) {
				for (const tier of info.stayPricingTiers) {
					await this._stayTierModel.create(
						{
							[StayPricingTierColumns.ListingId]: listing.id,
							[StayPricingTierColumns.GuestsUpTo]: tier.guestsUpTo,
							[StayPricingTierColumns.PricePerNight]: tier.pricePerNight
						} as any,
						{ transaction }
					);
				}
			}
		}
	}

	private async _destroyListings(propertyId: string, transaction?: Transaction): Promise<void> {
		const rows = await this._listingModel.findAll({
			where: { [ListingColumns.PropertyId]: propertyId },
			attributes: [ListingColumns.Id],
			transaction
		});
		if (!rows.length) return;
		const listingIds = rows.map((r) => r.id);
		// Applications keep their history but drop the offer reference — the
		// listingId FK (NO ACTION) would otherwise block the listing delete.
		await this._applicationModel.update(
			{ [PropertyApplicationColumns.ListingId]: null } as any,
			{ where: { [PropertyApplicationColumns.ListingId]: { [Op.in]: listingIds } }, transaction }
		);
		await this._stayTierModel.destroy({
			where: { [StayPricingTierColumns.ListingId]: { [Op.in]: listingIds } },
			transaction
		});
		await this._listingModel.destroy({ where: { [ListingColumns.PropertyId]: propertyId }, transaction });
	}

	// Headline price for the legacy NOT NULL Properties.rentAmount column: the
	// payload's own value, else the first sensible price among the listings.
	private _deriveHeadlineRent(info: CreatePropertyDto): number | undefined {
		if (info.rentAmount !== undefined) return info.rentAmount;
		const byType = (type: ListingType) => info.listings?.find((l) => l.listingType === type);
		return byType(ListingType.RENT)?.rentAmount ?? byType(ListingType.SALE)?.salePrice ?? byType(ListingType.SHORT_STAY)?.baseNightlyPrice;
	}

	private _listingInclude(listingWhere?: Record<string, any>) {
		return {
			model: this._listingModel,
			// A filter turns the LEFT JOIN into an INNER one: only properties that
			// carry a matching offer are returned, and only that offer rides along.
			...(listingWhere ? { where: listingWhere, required: true } : {}),
			include: [
				{
					model: this._stayTierModel,
					attributes: [StayPricingTierColumns.Id, StayPricingTierColumns.GuestsUpTo, StayPricingTierColumns.PricePerNight]
				}
			]
		};
	}

	// Listing-level filter for the buy / rent / stay tabs. The price range applies
	// to the intent's own price column (SALE → salePrice, RENT → rentAmount,
	// SHORT_STAY → baseNightlyPrice). Returns undefined when no tab is selected —
	// price ranges without a listingType fall back to the legacy minRent/maxRent
	// filter on the property's headline rent.
	private _buildListingWhere(filters: SearchPropertyDto, availability?: AvailabilityStatus): Record<string, any> | undefined {
		if (!filters.listingType) return undefined;

		const where: Record<string, any> = { [ListingColumns.ListingType]: filters.listingType };
		if (availability) where[ListingColumns.AvailabilityStatus] = availability;

		if (filters.minPrice !== undefined || filters.maxPrice !== undefined) {
			const priceColumn: Record<ListingType, string> = {
				[ListingType.SALE]: ListingColumns.SalePrice,
				[ListingType.RENT]: ListingColumns.RentAmount,
				[ListingType.SHORT_STAY]: ListingColumns.BaseNightlyPrice
			};
			const range: Record<symbol, number> = {};
			if (filters.minPrice !== undefined) range[Op.gte] = filters.minPrice;
			if (filters.maxPrice !== undefined) range[Op.lte] = filters.maxPrice;
			where[priceColumn[filters.listingType]] = range;
		}
		return where;
	}
	//#endregion

	//#region geo helpers
	// Sequelize can't model SQL Server's `geography` type, so the `location`
	// column used by radius search is written with a raw (parameterized) query
	// whenever the pin coordinates are set or moved.
	private async _syncLocation(propertyId: string, latitude: number, longitude: number, transaction?: Transaction): Promise<void> {
		if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return;
		await this._sequelize.query(
			'UPDATE dbo.Properties SET location = geography::Point(:lat, :lng, 4326) WHERE id = :id',
			{ replacements: { lat: latitude, lng: longitude, id: propertyId }, transaction }
		);
	}

	// Radius filter ("houses near Hyderpara"): active only when the full
	// lat/lng/radius trio arrives. Values are coerced to finite numbers before
	// being inlined into SQL literals, so there is no injection surface.
	private _buildGeoFilter(filters: SearchPropertyDto): { lat: number; lng: number; meters: number } | undefined {
		const lat = Number(filters.latitude);
		const lng = Number(filters.longitude);
		const radiusKm = Number(filters.radiusKm);
		if (!Number.isFinite(lat) || !Number.isFinite(lng) || !Number.isFinite(radiusKm) || radiusKm <= 0) return undefined;
		return { lat, lng, meters: Math.round(radiusKm * 1000) };
	}

	private _distanceExpression(geo: { lat: number; lng: number }): string {
		return `[Property].[location].STDistance(geography::Point(${geo.lat}, ${geo.lng}, 4326))`;
	}
	//#endregion

	//#region private helpers
	private _canManage(property: Property, claims: AtPayload): boolean {
		return property.ownerId === claims.sub || claims.role === RoleType.ADMIN;
	}

	// Appends a read-SAS to each media item's URLs so the (private) blobs render in the browser.
	private async _withMediaSas(items: any[]): Promise<any[]> {
		if (!Array.isArray(items) || items.length === 0) return items ?? [];
		const suffix = await this._blobSvc.getReadSasSuffix();
		return items.map((m) => ({
			...m,
			blobKey: this._blobSvc.withReadSas(m.blobKey, suffix),
			thumbnailKey: this._blobSvc.withReadSas(m.thumbnailKey, suffix)
		}));
	}

	// Serializes a property and SAS-signs its nested media URLs.
	private async _serializeProperty(property: Property | null): Promise<any> {
		if (!property) return property;
		const json: any = property.toJSON();
		if (Array.isArray(json.media)) json.media = await this._withMediaSas(json.media);
		return json;
	}

	private async _getMediaUsage(userId: string): Promise<number> {
		const user = await this._userModel.findByPk(userId, { attributes: [UserColumns.MediaUsedBytes] });
		return Number(user?.mediaUsedBytes ?? 0);
	}

	// Adjusts the user's running media-usage total, clamped at zero.
	private async _adjustUsage(userId: string, deltaBytes: number): Promise<void> {
		const current = await this._getMediaUsage(userId);
		const next = Math.max(0, current + deltaBytes);
		await this._userModel.update(
			{ [UserColumns.MediaUsedBytes]: next } as any,
			{ where: { [UserColumns.Id]: userId } }
		);
	}

	private get _sequelize() {
		return this._propertyModel.sequelize!;
	}

	// Resolves a free-text city name to its master-record id, creating the row on
	// first use. MSSQL's case-insensitive collation means "Mumbai"/"mumbai" match.
	private async _resolveCityId(name: string, transaction: Transaction): Promise<string> {
		const [city] = await this._cityModel.findOrCreate({
			where: { [CityColumns.Name]: name.trim() },
			defaults: { [CityColumns.Name]: name.trim() } as any,
			transaction
		});
		return city.id;
	}

	private async _resolveAmenityIds(names: string[], transaction: Transaction): Promise<string[]> {
		const ids: string[] = [];
		for (const raw of names) {
			const name = raw?.trim();
			if (!name) continue;
			const [amenity] = await this._amenityModel.findOrCreate({
				where: { [AmenityColumns.Name]: name },
				defaults: { [AmenityColumns.Name]: name } as any,
				transaction
			});
			ids.push(amenity.id);
		}
		return ids;
	}

	// Resolves a city-name filter to a cityId in `where`. Returns false when a name
	// was given but no matching city exists (caller should short-circuit to empty).
	private async _applyCityFilter(where: Record<string, any>, name?: string): Promise<boolean> {
		if (!name) return true;
		const city = await this._cityModel.findOne({ where: { [CityColumns.Name]: name.trim() } });
		if (!city) return false;
		where[PropertyColumns.CityId] = city.id;
		return true;
	}

	// Shared filter builder for search + my-listings (type / rent range). City is
	// resolved separately via _applyCityFilter.
	private _buildFilterWhere(filters: SearchPropertyDto): WhereOptions & Record<string, any> {
		const where: Record<string, any> = {};

		if (filters.propertyTypeId) where[PropertyColumns.PropertyTypeId] = filters.propertyTypeId;
		if (filters.availabilityStatus) where[PropertyColumns.AvailabilityStatus] = filters.availabilityStatus;

		if (filters.minRent !== undefined || filters.maxRent !== undefined) {
			const rentRange: Record<symbol, number> = {};
			if (filters.minRent !== undefined) rentRange[Op.gte] = filters.minRent;
			if (filters.maxRent !== undefined) rentRange[Op.lte] = filters.maxRent;
			where[PropertyColumns.RentAmount] = rentRange;
		}

		return where;
	}

	private _cityInclude() {
		return { model: this._cityModel, attributes: [CityColumns.Id, CityColumns.Name, CityColumns.State] };
	}

	private _propertyTypeInclude() {
		return { model: this._propertyTypeModel, attributes: [PropertyTypeColumns.Id, PropertyTypeColumns.Name] };
	}

	private _amenityInclude() {
		return {
			model: this._amenityModel,
			through: { attributes: [] },
			attributes: [AmenityColumns.Id, AmenityColumns.Name]
		};
	}

	private async _findFull(id: string): Promise<Property | null> {
		return this._propertyModel.findByPk(id, {
			include: [
				{ model: this._userModel, attributes: [UserColumns.Id, UserColumns.FullName, UserColumns.Email, UserColumns.Phone] },
				this._cityInclude(),
				this._propertyTypeInclude(),
				this._amenityInclude(),
				this._listingInclude(),
				{
					model: this._propertyMediaModel,
					attributes: [PropertyMediaColumns.Id, PropertyMediaColumns.Type, PropertyMediaColumns.BlobKey, PropertyMediaColumns.ThumbnailKey, PropertyMediaColumns.SortOrder]
				}
			],
			order: [[{ model: this._propertyMediaModel, as: 'media' }, PropertyMediaColumns.SortOrder, 'ASC']]
		});
	}

	private _emptyPage(page?: number, pageSize?: number): AppResponse {
		return createResponse(HttpStatus.OK, messages.P2, {
			items: [],
			total: 0,
			page: page && page > 0 ? page : DEFAULT_PAGE,
			pageSize: pageSize && pageSize > 0 ? pageSize : DEFAULT_PAGE_SIZE
		});
	}

	private async _paginatedFind(
		where: WhereOptions,
		page?: number,
		pageSize?: number,
		listingWhere?: Record<string, any>,
		geo?: { lat: number; lng: number; meters: number }
	): Promise<AppResponse> {
		const currentPage = page && page > 0 ? page : DEFAULT_PAGE;
		const limit = pageSize && pageSize > 0 ? pageSize : DEFAULT_PAGE_SIZE;
		const offset = (currentPage - 1) * limit;

		// Radius search: constrain via the spatial index, surface the computed
		// distance as `distanceMeters`, and order nearest-first instead of newest.
		const geoWhere = geo
			? literal(`([Property].[location] IS NOT NULL AND ${this._distanceExpression(geo)} <= ${geo.meters})`)
			: undefined;
		const attributes = geo
			? { include: [[literal(this._distanceExpression(geo)), 'distanceMeters']] as any }
			: undefined;
		const order: any = geo ? literal('[distanceMeters] ASC') : [['createdAt', 'DESC']];

		const { rows, count } = await this._propertyModel.findAndCountAll({
			where: geoWhere ? ({ [Op.and]: [where, geoWhere] } as WhereOptions) : where,
			attributes,
			include: [
				// Contact gating: cards never carry the owner's phone/email — those are
				// revealed on the detail endpoint only after an accepted application.
				{ model: this._userModel, attributes: [UserColumns.Id, UserColumns.FullName] },
				this._cityInclude(),
				this._propertyTypeInclude(),
				this._listingInclude(listingWhere),
				{
					model: this._propertyMediaModel,
					attributes: [PropertyMediaColumns.Id, PropertyMediaColumns.Type, PropertyMediaColumns.BlobKey, PropertyMediaColumns.ThumbnailKey, PropertyMediaColumns.SortOrder]
				}
			],
			limit,
			offset,
			order,
			distinct: true // count distinct properties, not the media-joined rows
		});

		const items = await Promise.all(rows.map((r) => this._serializeProperty(r)));
		return createResponse(HttpStatus.OK, messages.P2, {
			items,
			total: count,
			page: currentPage,
			pageSize: limit
		});
	}
	//#endregion
}
