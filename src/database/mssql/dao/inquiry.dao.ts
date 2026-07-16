import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import { InquiryAbstractSqlDao } from '../abstract/inquiry.abstract';
import { MsSqlConstants } from '../connection/constants.mssql';
import { Inquiry, InquiryColumns, Property, PropertyColumns, User, UserColumns } from '../models';
import AppLogger from '@app/core/logger/app-logger';
import { AppResponse, createResponse } from '@app/shared/appresponse.shared';
import { messages } from '@app/shared/messages.shared';
import { AtPayload } from '@app/shared/models.shared';
import { CreateInquiryDto } from '@app/modules/inquiry/dto/inquiry.dto';
import { RoleType } from '@app/core/enums/app-role.enum';
import { InquiryStatus } from '@app/core/enums/domain.enum';

@Injectable()
export class InquirySqlDao implements InquiryAbstractSqlDao {
    constructor(
        @Inject(MsSqlConstants.INQUIRIES) private _inquiryModel: typeof Inquiry,
        @Inject(MsSqlConstants.PROPERTIES) private _propertyModel: typeof Property,
        @Inject(MsSqlConstants.USERS) private _userModel: typeof User,
        readonly _loggerSvc: AppLogger
    ) { }

    async createInquiry(createInquiryInfo: CreateInquiryDto, claims: AtPayload): Promise<AppResponse> {
        try {
            if (claims?.role !== RoleType.SEEKER && claims?.role !== RoleType.ADMIN) {
                return createResponse(HttpStatus.FORBIDDEN, messages.E7.replace('{0}', 'create inquiry'));
            }

            const property = await this._propertyModel.findByPk(createInquiryInfo.propertyId);
            if (!property) {
                return createResponse(HttpStatus.NOT_FOUND, 'Property not found');
            }

            const seeker = await this._userModel.findByPk(claims.sub);
            if (!seeker) {
                return createResponse(HttpStatus.NOT_FOUND, messages.U5);
            }

            const inquiry = await this._inquiryModel.create({
                [InquiryColumns.PropertyId]: createInquiryInfo.propertyId,
                [InquiryColumns.SeekerId]: claims.sub,
                [InquiryColumns.Message]: createInquiryInfo.message,
                [InquiryColumns.Status]: InquiryStatus.OPEN
            } as any);

            return createResponse(HttpStatus.CREATED, 'Inquiry created successfully', inquiry);
        } catch (error: any) {
            this._loggerSvc.error(error, HttpStatus.INTERNAL_SERVER_ERROR, claims?.sid);
            return createResponse(HttpStatus.INTERNAL_SERVER_ERROR, messages.E2);
        }
    }
}
