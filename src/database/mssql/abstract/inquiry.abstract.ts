import { AppResponse } from '@app/shared/appresponse.shared';
import { AtPayload } from '@app/shared/models.shared';
import { CreateInquiryDto } from '@app/modules/inquiry/dto/inquiry.dto';

export abstract class InquiryAbstractSqlDao {
    abstract createInquiry(createInquiryInfo: CreateInquiryDto, claims: AtPayload): Promise<AppResponse>;
}
