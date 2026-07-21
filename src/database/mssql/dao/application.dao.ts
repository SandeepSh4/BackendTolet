import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import { Op } from 'sequelize';
import { ApplicationAbstractSqlDao } from '../abstract/application.abstract';
import { MsSqlConstants } from '../connection/constants.mssql';
import {
	Property,
	PropertyColumns,
	PropertyApplication,
	PropertyApplicationColumns,
	Listing,
	ListingColumns,
	Notification,
	NotificationColumns,
	User,
	UserColumns,
	City,
	CityColumns,
	PropertyType,
	PropertyTypeColumns
} from '../models';
import AppLogger from '@app/core/logger/app-logger';
import { AppConfigService } from '@app/config/appconfig.service';
import { AppResponse, createResponse } from '@app/shared/appresponse.shared';
import { messageFactory, messages } from '@app/shared/messages.shared';
import { AtPayload } from '@app/shared/models.shared';
import { ApplicationStatus, KycStatus, NotificationType } from '@app/core/enums/domain.enum';
import { RoleType } from '@app/core/enums/app-role.enum';
import { RealtimePublisherService } from '@app/core/realtime/realtime-publisher.service';
import { RealtimeEvents } from '@app/core/realtime/realtime.constants';
import { CreateApplicationDto, DecideApplicationDto, ReceivedApplicationsDto } from '@app/modules/application/dto/application.dto';

// Statuses that block a new application for the same property.
const ACTIVE_STATUSES = [ApplicationStatus.PENDING, ApplicationStatus.ACCEPTED];

@Injectable()
export class ApplicationSqlDao implements ApplicationAbstractSqlDao {
	constructor(
		@Inject(MsSqlConstants.PROPERTY_APPLICATIONS) private _applicationModel: typeof PropertyApplication,
		@Inject(MsSqlConstants.PROPERTIES) private _propertyModel: typeof Property,
		@Inject(MsSqlConstants.LISTINGS) private _listingModel: typeof Listing,
		@Inject(MsSqlConstants.NOTIFICATIONS) private _notificationModel: typeof Notification,
		@Inject(MsSqlConstants.USERS) private _userModel: typeof User,
		@Inject(MsSqlConstants.CITIES) private _cityModel: typeof City,
		@Inject(MsSqlConstants.PROPERTY_TYPES) private _propertyTypeModel: typeof PropertyType,
		readonly _loggerSvc: AppLogger,
		private readonly _appConfigSvc: AppConfigService,
		private readonly _realtimeSvc: RealtimePublisherService
	) {}

	async apply(info: CreateApplicationDto, claims: AtPayload): Promise<AppResponse> {
		try {
			const property = await this._propertyModel.findByPk(info.propertyId);
			if (!property) {
				return createResponse(HttpStatus.NOT_FOUND, messages.P5);
			}
			if (property.ownerId === claims.sub) {
				return createResponse(HttpStatus.BAD_REQUEST, messages.AP8);
			}

			// Optional KYC gate (config-driven; off until the KYC flow ships).
			if (this._appConfigSvc.get('app').requireKycToApply) {
				const seeker = await this._userModel.findByPk(claims.sub, { attributes: [UserColumns.Id, UserColumns.KycStatus] });
				if (seeker?.kycStatus !== KycStatus.VERIFIED) {
					return createResponse(HttpStatus.FORBIDDEN, messages.AP9);
				}
			}

			// One ACTIVE application per (property, seeker).
			const existing = await this._applicationModel.findOne({
				where: {
					[PropertyApplicationColumns.PropertyId]: info.propertyId,
					[PropertyApplicationColumns.SeekerId]: claims.sub,
					[PropertyApplicationColumns.Status]: { [Op.in]: ACTIVE_STATUSES }
				}
			});
			if (existing) {
				return createResponse(HttpStatus.CONFLICT, messages.AP7);
			}

			// The chosen offer must belong to this property.
			if (info.listingId) {
				const listing = await this._listingModel.findOne({
					where: { [ListingColumns.Id]: info.listingId, [ListingColumns.PropertyId]: info.propertyId }
				});
				if (!listing) {
					return createResponse(HttpStatus.BAD_REQUEST, messageFactory(messages.W1, ['Listing']));
				}
			}

			const application = await this._applicationModel.create({
				[PropertyApplicationColumns.PropertyId]: info.propertyId,
				[PropertyApplicationColumns.SeekerId]: claims.sub,
				[PropertyApplicationColumns.ListingId]: info.listingId ?? null,
				[PropertyApplicationColumns.Note]: info.note ?? null,
				[PropertyApplicationColumns.Status]: ApplicationStatus.PENDING
			} as any);

			// Notify the owner (persisted; realtime push arrives in Phase B).
			const seeker = await this._userModel.findByPk(claims.sub, { attributes: [UserColumns.FullName] });
			await this._notify(property.ownerId, NotificationType.APPLICATION_RECEIVED, {
				applicationId: application.id,
				propertyId: property.id,
				propertyTitle: property.title,
				seekerName: seeker?.fullName ?? 'A seeker'
			});

			return createResponse(HttpStatus.CREATED, messages.AP1, application);
		} catch (error: any) {
			this._loggerSvc.error(error, HttpStatus.INTERNAL_SERVER_ERROR, claims?.sid);
			return createResponse(HttpStatus.INTERNAL_SERVER_ERROR, messages.E2);
		}
	}

	async myApplications(claims: AtPayload): Promise<AppResponse> {
		try {
			const applications = await this._applicationModel.findAll({
				where: { [PropertyApplicationColumns.SeekerId]: claims.sub },
				include: [
					{
						model: this._propertyModel,
						attributes: [PropertyColumns.Id, PropertyColumns.Title, PropertyColumns.RentAmount, PropertyColumns.Currency],
						include: [
							{ model: this._cityModel, attributes: [CityColumns.Id, CityColumns.Name] },
							{ model: this._propertyTypeModel, attributes: [PropertyTypeColumns.Id, PropertyTypeColumns.Name] }
						]
					},
					{ model: this._listingModel, attributes: [ListingColumns.Id, ListingColumns.ListingType] }
				],
				order: [['createdAt', 'DESC']]
			});
			return createResponse(HttpStatus.OK, messages.AP2, applications);
		} catch (error: any) {
			this._loggerSvc.error(error, HttpStatus.INTERNAL_SERVER_ERROR, claims?.sid);
			return createResponse(HttpStatus.INTERNAL_SERVER_ERROR, messages.E2);
		}
	}

	async received(filters: ReceivedApplicationsDto, claims: AtPayload): Promise<AppResponse> {
		try {
			const where: Record<string, any> = {};
			if (filters.propertyId) where[PropertyApplicationColumns.PropertyId] = filters.propertyId;
			if (filters.status) where[PropertyApplicationColumns.Status] = filters.status;

			const applications = await this._applicationModel.findAll({
				where,
				include: [
					{
						model: this._propertyModel,
						attributes: [PropertyColumns.Id, PropertyColumns.Title, PropertyColumns.OwnerId],
						// Owner sees applications for THEIR properties only (admin sees all).
						where: claims.role === RoleType.ADMIN ? undefined : { [PropertyColumns.OwnerId]: claims.sub },
						required: true,
						include: [{ model: this._cityModel, attributes: [CityColumns.Id, CityColumns.Name] }]
					},
					{
						model: this._userModel,
						// The seeker applied voluntarily — the owner gets their contact details.
						attributes: [UserColumns.Id, UserColumns.FullName, UserColumns.Email, UserColumns.Phone, UserColumns.KycStatus]
					},
					{ model: this._listingModel, attributes: [ListingColumns.Id, ListingColumns.ListingType] }
				],
				order: [['createdAt', 'DESC']]
			});

			// "Seen by owner" signal: stamp viewedAt on the pending rows just fetched.
			const unseenIds = applications.filter((a) => !a.viewedAt && a.status === ApplicationStatus.PENDING).map((a) => a.id);
			if (unseenIds.length) {
				await this._applicationModel.update(
					{ [PropertyApplicationColumns.ViewedAt]: new Date() } as any,
					{ where: { [PropertyApplicationColumns.Id]: { [Op.in]: unseenIds } } }
				);
			}

			return createResponse(HttpStatus.OK, messages.AP2, applications);
		} catch (error: any) {
			this._loggerSvc.error(error, HttpStatus.INTERNAL_SERVER_ERROR, claims?.sid);
			return createResponse(HttpStatus.INTERNAL_SERVER_ERROR, messages.E2);
		}
	}

	async decide(id: string, info: DecideApplicationDto, claims: AtPayload): Promise<AppResponse> {
		try {
			const application = await this._applicationModel.findByPk(id, {
				include: [{ model: this._propertyModel, attributes: [PropertyColumns.Id, PropertyColumns.Title, PropertyColumns.OwnerId] }]
			});
			if (!application || !application.property) {
				return createResponse(HttpStatus.NOT_FOUND, messages.AP6);
			}
			if (application.property.ownerId !== claims.sub && claims.role !== RoleType.ADMIN) {
				return createResponse(HttpStatus.FORBIDDEN, messages.E7.replace('{0}', 'decide this application'));
			}
			if (application.status !== ApplicationStatus.PENDING) {
				return createResponse(HttpStatus.BAD_REQUEST, messageFactory(messages.AP10, ['decided']));
			}

			const accepted = info.action === 'ACCEPT';
			await application.update({
				[PropertyApplicationColumns.Status]: accepted ? ApplicationStatus.ACCEPTED : ApplicationStatus.REJECTED,
				[PropertyApplicationColumns.RejectionReason]: accepted ? null : (info.reason ?? null),
				[PropertyApplicationColumns.DecidedAt]: new Date()
			} as any);

			await this._notify(
				application.seekerId,
				accepted ? NotificationType.APPLICATION_ACCEPTED : NotificationType.APPLICATION_REJECTED,
				{
					applicationId: application.id,
					propertyId: application.property.id,
					propertyTitle: application.property.title,
					...(accepted ? {} : { reason: info.reason ?? null })
				}
			);

			return createResponse(HttpStatus.OK, accepted ? messages.AP3 : messages.AP4, application);
		} catch (error: any) {
			this._loggerSvc.error(error, HttpStatus.INTERNAL_SERVER_ERROR, claims?.sid);
			return createResponse(HttpStatus.INTERNAL_SERVER_ERROR, messages.E2);
		}
	}

	async withdraw(id: string, claims: AtPayload): Promise<AppResponse> {
		try {
			const application = await this._applicationModel.findByPk(id);
			if (!application || application.seekerId !== claims.sub) {
				return createResponse(HttpStatus.NOT_FOUND, messages.AP6);
			}
			if (application.status !== ApplicationStatus.PENDING) {
				return createResponse(HttpStatus.BAD_REQUEST, messageFactory(messages.AP10, ['withdrawn']));
			}
			await application.update({ [PropertyApplicationColumns.Status]: ApplicationStatus.WITHDRAWN } as any);
			return createResponse(HttpStatus.OK, messages.AP5);
		} catch (error: any) {
			this._loggerSvc.error(error, HttpStatus.INTERNAL_SERVER_ERROR, claims?.sid);
			return createResponse(HttpStatus.INTERNAL_SERVER_ERROR, messages.E2);
		}
	}

	// Persist-then-push: the notification row is the source of truth (offline
	// users pick it up from the API); the socket emit is a live enhancement on top.
	private async _notify(userId: string, type: NotificationType, payload: Record<string, any>): Promise<void> {
		try {
			const row = await this._notificationModel.create({
				[NotificationColumns.UserId]: userId,
				[NotificationColumns.Type]: type,
				[NotificationColumns.Payload]: JSON.stringify(payload)
			} as any);
			// Emit the same shape the REST list endpoint returns (payload parsed).
			this._realtimeSvc.publishToUser(userId, RealtimeEvents.NOTIFICATION, { ...row.toJSON(), payload });
		} catch (error: any) {
			// A failed notification must never fail the main action.
			this._loggerSvc.error(error, HttpStatus.INTERNAL_SERVER_ERROR);
		}
	}
}
