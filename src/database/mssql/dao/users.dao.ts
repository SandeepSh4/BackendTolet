import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import { Op } from 'sequelize';
import * as argon2 from 'argon2';
import { UserAbstractSqlDao } from '../abstract/users.abstract';
import { MsSqlConstants } from '../connection/constants.mssql';
import {
	User,
	UserColumns,
	UserSession,
	UserSessionColumns,
	OwnerProfile,
	OwnerProfileColumns,
	AgentProfile,
	AgentProfileColumns
} from '../models';
import AppLogger from '@app/core/logger/app-logger';
import { AppResponse, createResponse } from '@app/shared/appresponse.shared';
import { messages } from '@app/shared/messages.shared';
import { AtPayload } from '@app/shared/models.shared';
import { RoleType } from '@app/core/enums/app-role.enum';
import { AdminCreateUserDto, AdminUpdateUserDto, ListUsersQueryDto } from '@app/modules/user/dto/users.dto';

const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 20;

@Injectable()
export class UserSqlDao implements UserAbstractSqlDao {
	constructor(
		@Inject(MsSqlConstants.USERS) private _userModel: typeof User,
		@Inject(MsSqlConstants.USER_SESSIONS) private _sessionModel: typeof UserSession,
		@Inject(MsSqlConstants.OWNER_PROFILES) private _ownerProfileModel: typeof OwnerProfile,
		@Inject(MsSqlConstants.AGENT_PROFILES) private _agentProfileModel: typeof AgentProfile,
		readonly _loggerSvc: AppLogger
	) {}

	//#region getProfile
	async getProfile(userId: string, claims: AtPayload): Promise<AppResponse> {
		try {
			const user = await this._userModel.findByPk(userId, {
				attributes: [
					UserColumns.Id,
					UserColumns.Email,
					UserColumns.FullName,
					UserColumns.Phone,
					UserColumns.Role,
					UserColumns.KycStatus,
					'createdAt'
				],
				include: [
					{ model: this._ownerProfileModel, attributes: [OwnerProfileColumns.BusinessName] },
					{
						model: this._agentProfileModel,
						attributes: [AgentProfileColumns.IsApproved, AgentProfileColumns.IsAvailable]
					}
				]
			});
			if (!user) {
				return createResponse(HttpStatus.NOT_FOUND, messages.U5);
			}
			return createResponse(HttpStatus.OK, messages.U7, user);
		} catch (error: any) {
			this._loggerSvc.error(error, HttpStatus.INTERNAL_SERVER_ERROR, claims?.sid);
			return createResponse(HttpStatus.INTERNAL_SERVER_ERROR, messages.E2);
		}
	}
	//#endregion

	//#region listUsers (admin)
	async listUsers(filters: ListUsersQueryDto): Promise<AppResponse> {
		try {
			const where: Record<string, any> = {};
			if (filters.role) where[UserColumns.Role] = filters.role;
			if (filters.search?.trim()) {
				const term = `%${filters.search.trim()}%`;
				where[Op.or as any] = [
					{ [UserColumns.Email]: { [Op.like]: term } },
					{ [UserColumns.FullName]: { [Op.like]: term } }
				];
			}

			const currentPage = filters.page && filters.page > 0 ? Number(filters.page) : DEFAULT_PAGE;
			const limit = filters.pageSize && filters.pageSize > 0 ? Number(filters.pageSize) : DEFAULT_PAGE_SIZE;
			const offset = (currentPage - 1) * limit;

			const { rows, count } = await this._userModel.findAndCountAll({
				where,
				attributes: { exclude: [UserColumns.PasswordHash] },
				limit,
				offset,
				order: [['createdAt', 'DESC']]
			});

			return createResponse(HttpStatus.OK, messages.U1, {
				items: rows,
				total: count,
				page: currentPage,
				pageSize: limit
			});
		} catch (error: any) {
			this._loggerSvc.error(error, HttpStatus.INTERNAL_SERVER_ERROR);
			return createResponse(HttpStatus.INTERNAL_SERVER_ERROR, messages.E2);
		}
	}
	//#endregion

	//#region getUserById (admin)
	async getUserById(userId: string): Promise<AppResponse> {
		try {
			const user = await this._userModel.findByPk(userId, {
				attributes: { exclude: [UserColumns.PasswordHash] },
				include: [
					{ model: this._ownerProfileModel, attributes: [OwnerProfileColumns.BusinessName] },
					{
						model: this._agentProfileModel,
						attributes: [AgentProfileColumns.IsApproved, AgentProfileColumns.IsAvailable]
					}
				]
			});
			if (!user) {
				return createResponse(HttpStatus.NOT_FOUND, messages.U5);
			}
			return createResponse(HttpStatus.OK, messages.U7, user);
		} catch (error: any) {
			this._loggerSvc.error(error, HttpStatus.INTERNAL_SERVER_ERROR);
			return createResponse(HttpStatus.INTERNAL_SERVER_ERROR, messages.E2);
		}
	}
	//#endregion

	//#region createUser (admin)
	async createUser(createInfo: AdminCreateUserDto, claims: AtPayload): Promise<AppResponse> {
		try {
			const existing = await this._userModel.findOne({
				where: { [UserColumns.Email]: createInfo.email }
			});
			if (existing) {
				return createResponse(HttpStatus.CONFLICT, messages.U6);
			}

			const passwordHash = await argon2.hash(createInfo.password);
			const user = await this._userModel.create({
				[UserColumns.Email]: createInfo.email,
				[UserColumns.PasswordHash]: passwordHash,
				[UserColumns.FullName]: createInfo.fullName,
				[UserColumns.Phone]: createInfo.phone ?? null,
				[UserColumns.Role]: createInfo.role,
				[UserColumns.IsActive]: createInfo.isActive ?? true
			} as any);

			await this._ensureRoleProfile(user.id, createInfo.role);
			return createResponse(HttpStatus.CREATED, messages.U2, this._sanitize(user));
		} catch (error: any) {
			this._loggerSvc.error(error, HttpStatus.INTERNAL_SERVER_ERROR, claims?.sid);
			return createResponse(HttpStatus.INTERNAL_SERVER_ERROR, messages.E2);
		}
	}
	//#endregion

	//#region updateUser (admin)
	async updateUser(userId: string, updateInfo: AdminUpdateUserDto, claims: AtPayload): Promise<AppResponse> {
		try {
			const user = await this._userModel.findByPk(userId);
			if (!user) {
				return createResponse(HttpStatus.NOT_FOUND, messages.U5);
			}

			const patch: Record<string, any> = {};
			if (updateInfo.fullName !== undefined) patch[UserColumns.FullName] = updateInfo.fullName;
			if (updateInfo.phone !== undefined) patch[UserColumns.Phone] = updateInfo.phone;
			if (updateInfo.role !== undefined) patch[UserColumns.Role] = updateInfo.role;
			if (updateInfo.isActive !== undefined) patch[UserColumns.IsActive] = updateInfo.isActive;

			await user.update(patch);

			// Keep role-specific profile in step with a role change.
			if (updateInfo.role !== undefined) {
				await this._ensureRoleProfile(userId, updateInfo.role);
			}

			// Deactivating a user immediately revokes their active sessions so existing
			// tokens stop working (enforced per-request by the auth guard).
			if (updateInfo.isActive === false) {
				await this._revokeUserSessions(userId);
			}

			return createResponse(HttpStatus.OK, messages.U3, this._sanitize(user));
		} catch (error: any) {
			this._loggerSvc.error(error, HttpStatus.INTERNAL_SERVER_ERROR, claims?.sid);
			return createResponse(HttpStatus.INTERNAL_SERVER_ERROR, messages.E2);
		}
	}
	//#endregion

	//#region private helpers
	// Ensures the OWNER/AGENT profile row exists for the given role (no-op for SEEKER/ADMIN).
	private async _ensureRoleProfile(userId: string, role: RoleType): Promise<void> {
		if (role === RoleType.OWNER) {
			await this._ownerProfileModel.findOrCreate({
				where: { [OwnerProfileColumns.UserId]: userId },
				defaults: { [OwnerProfileColumns.UserId]: userId } as any
			});
		} else if (role === RoleType.AGENT) {
			await this._agentProfileModel.findOrCreate({
				where: { [AgentProfileColumns.UserId]: userId },
				defaults: {
					[AgentProfileColumns.UserId]: userId,
					[AgentProfileColumns.IsApproved]: false
				} as any
			});
		}
	}

	async getMediaUsage(userId: string): Promise<number> {
		const user = await this._userModel.findByPk(userId, { attributes: [UserColumns.MediaUsedBytes] });
		return Number(user?.mediaUsedBytes ?? 0);
	}

	private async _revokeUserSessions(userId: string): Promise<void> {
		await this._sessionModel.update(
			{ [UserSessionColumns.RevokedAt]: new Date() } as any,
			{ where: { [UserSessionColumns.UserId]: userId, [UserSessionColumns.RevokedAt]: null } }
		);
	}

	private _sanitize(user: User) {
		const { passwordHash, ...rest } = user.toJSON() as any;
		return rest;
	}
	//#endregion
}
