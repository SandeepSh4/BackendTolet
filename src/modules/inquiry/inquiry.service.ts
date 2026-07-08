import { Injectable } from '@nestjs/common';
import { InquiryAbstractSvc } from './inquiry.abstract';
import { DatabaseService } from '@app/database/database.service';
import { AppResponse } from '@app/shared/appresponse.shared';
import { AtPayload } from '@app/shared/models.shared';
import { CreateInquiryDto } from './dto/inquiry.dto';

@Injectable()
export class InquiryService implements InquiryAbstractSvc {
    constructor(private readonly _dbSvc: DatabaseService) { }

    async createInquiry(createInquiryInfo: CreateInquiryDto, claims: AtPayload): Promise<AppResponse> {
        return this._dbSvc.inquirySqlTxn.createInquiry(createInquiryInfo, claims);
    }
}
