import { AppResponse } from '@app/shared/appresponse.shared';
import { AtPayload } from '@app/shared/models.shared';
import { CreateInquiryDto } from './dto/inquiry.dto';

export abstract class InquiryAbstractSvc {
    abstract createInquiry(createInquiryInfo: CreateInquiryDto, claims: AtPayload): Promise<AppResponse>;
}
