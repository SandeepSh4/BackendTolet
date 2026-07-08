import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import { Op, Transaction, WhereOptions } from 'sequelize';
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
	User,
	UserColumns
} from '../models';
import AppLogger from '@app/core/logger/app-logger';
import { AppResponse, createResponse } from '@app/shared/appresponse.shared';
import { messages } from '@app/shared/messages.shared';
import { AtPayload } from '@app/shared/models.shared';
import { AvailabilityStatus } from '@app/core/enums/domain.enum';
import { CreatePropertyDto, MyListingsDto, SearchPropertyDto, UpdatePropertyDto } from '@app/modules/property/dto/property.dto';

const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 12;

@Injectable()
export class PropertySqlDao implements PropertyAbstractSqlDao {
	constructor(
		@Inject(MsSqlConstants.PROPERTIES) private _propertyModel: typeof Property,
		@Inject(MsSqlConstants.PROPERTY_MEDIA) private _propertyMediaModel: typeof PropertyMedia,
		@Inject(MsSqlConstants.CITIES) private _cityModel: typeof City,
		@Inject(MsSqlConstants.AMENITIES) private _amenityModel: typeof Amenity,
		@Inject(MsSqlConstants.USERS) private _userModel: typeof User,
		readonly _loggerSvc: AppLogger
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
			return this._paginatedFind(where, filters.page, filters.pageSize);
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
			return this._paginatedFind(where, filters.page, filters.pageSize);
		} catch (error: any) {
			this._loggerSvc.error(error, HttpStatus.INTERNAL_SERVER_ERROR, claims?.sid);
			return createResponse(HttpStatus.INTERNAL_SERVER_ERROR, messages.E2);
		}
	}

	async create(createInfo: CreatePropertyDto, claims: AtPayload): Promise<AppResponse> {
		const transaction = await this._sequelize.transaction();
		try {
			const cityId = await this._resolveCityId(createInfo.city, transaction);

			const property = await this._propertyModel.create(
				{
					[PropertyColumns.OwnerId]: claims.sub,
					[PropertyColumns.Title]: createInfo.title,
					[PropertyColumns.Description]: createInfo.description,
					[PropertyColumns.Type]: createInfo.type,
					[PropertyColumns.RentAmount]: createInfo.rentAmount,
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

			await transaction.commit();
			const full = await this._findFull(property.id);
			return createResponse(HttpStatus.CREATED, messages.P1, full);
		} catch (error: any) {
			await transaction.rollback();
			this._loggerSvc.error(error, HttpStatus.INTERNAL_SERVER_ERROR, claims?.sid);
			return createResponse(HttpStatus.INTERNAL_SERVER_ERROR, messages.E2);
		}
	}

	async getById(id: string): Promise<AppResponse> {
		try {
			const property = await this._findFull(id);
			if (!property) {
				return createResponse(HttpStatus.NOT_FOUND, messages.P5);
			}
			return createResponse(HttpStatus.OK, messages.P2, property);
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
			if (property.ownerId !== claims.sub) {
				await transaction.rollback();
				return createResponse(HttpStatus.FORBIDDEN, messages.E7.replace('{0}', 'update this property'));
			}

			// `city` and `amenities` are not direct columns — handle them separately.
			const { city, amenities, ...columns } = updateInfo;
			const patch: Record<string, any> = { ...columns };
			if (city !== undefined) {
				patch[PropertyColumns.CityId] = await this._resolveCityId(city, transaction);
			}
			await property.update(patch, { transaction });

			if (amenities !== undefined) {
				const amenityIds = await this._resolveAmenityIds(amenities, transaction);
				await property.$set('amenities', amenityIds, { transaction });
			}

			await transaction.commit();
			const full = await this._findFull(id);
			return createResponse(HttpStatus.OK, messages.P3, full);
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
			if (property.ownerId !== claims.sub) {
				return createResponse(HttpStatus.FORBIDDEN, messages.E7.replace('{0}', 'delete this property'));
			}

			await property.destroy();
			return createResponse(HttpStatus.OK, messages.P4);
		} catch (error: any) {
			this._loggerSvc.error(error, HttpStatus.INTERNAL_SERVER_ERROR, claims?.sid);
			return createResponse(HttpStatus.INTERNAL_SERVER_ERROR, messages.E2);
		}
	}

	//#region private helpers
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

		if (filters.type) where[PropertyColumns.Type] = filters.type;
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
				this._amenityInclude(),
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

	private async _paginatedFind(where: WhereOptions, page?: number, pageSize?: number): Promise<AppResponse> {
		const currentPage = page && page > 0 ? page : DEFAULT_PAGE;
		const limit = pageSize && pageSize > 0 ? pageSize : DEFAULT_PAGE_SIZE;
		const offset = (currentPage - 1) * limit;

		const { rows, count } = await this._propertyModel.findAndCountAll({
			where,
			include: [
				{ model: this._userModel, attributes: [UserColumns.Id, UserColumns.FullName, UserColumns.Phone, UserColumns.Email] },
				this._cityInclude(),
				{
					model: this._propertyMediaModel,
					attributes: [PropertyMediaColumns.Id, PropertyMediaColumns.BlobKey, PropertyMediaColumns.ThumbnailKey, PropertyMediaColumns.SortOrder]
				}
			],
			limit,
			offset,
			order: [['createdAt', 'DESC']],
			distinct: true // count distinct properties, not the media-joined rows
		});

		return createResponse(HttpStatus.OK, messages.P2, {
			items: rows,
			total: count,
			page: currentPage,
			pageSize: limit
		});
	}
	//#endregion
}
