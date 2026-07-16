import { Injectable } from '@nestjs/common';
import { UserAbstractSvc } from './users.abstract';
import { DatabaseService } from '@app/database/database.service';
import { AppResponse } from '@app/shared/appresponse.shared';
import { AtPayload } from '@app/shared/models.shared';
import { AdminCreateUserDto, AdminUpdateUserDto, ListUsersQueryDto } from './dto/users.dto';

@Injectable()
export class UserService implements UserAbstractSvc {
	constructor(private readonly _dbSvc: DatabaseService) {}

	async getProfile(userId: string, claims: AtPayload): Promise<AppResponse> {
		return this._dbSvc.userSqlTxn.getProfile(userId, claims);
	}

	async listUsers(filters: ListUsersQueryDto): Promise<AppResponse> {
		return this._dbSvc.userSqlTxn.listUsers(filters);
	}

	async getUserById(userId: string): Promise<AppResponse> {
		return this._dbSvc.userSqlTxn.getUserById(userId);
	}

	async createUser(createInfo: AdminCreateUserDto, claims: AtPayload): Promise<AppResponse> {
		return this._dbSvc.userSqlTxn.createUser(createInfo, claims);
	}

	async updateUser(userId: string, updateInfo: AdminUpdateUserDto, claims: AtPayload): Promise<AppResponse> {
		return this._dbSvc.userSqlTxn.updateUser(userId, updateInfo, claims);
	}
}
