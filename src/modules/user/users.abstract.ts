import { AppResponse } from '@app/shared/appresponse.shared';
import { AtPayload } from '@app/shared/models.shared';
import { AdminCreateUserDto, AdminUpdateUserDto, ListUsersQueryDto } from './dto/users.dto';

export abstract class UserAbstractSvc {
	abstract getProfile(userId: string, claims: AtPayload): Promise<AppResponse>;
	abstract listUsers(filters: ListUsersQueryDto): Promise<AppResponse>;
	abstract getUserById(userId: string): Promise<AppResponse>;
	abstract createUser(createInfo: AdminCreateUserDto, claims: AtPayload): Promise<AppResponse>;
	abstract updateUser(userId: string, updateInfo: AdminUpdateUserDto, claims: AtPayload): Promise<AppResponse>;
}
