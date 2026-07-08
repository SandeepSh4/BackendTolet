import { Module } from '@nestjs/common';
import { InquiryController } from './inquiry.controller';
import { InquiryAbstractSvc } from './inquiry.abstract';
import { InquiryService } from './inquiry.service';

@Module({
    controllers: [InquiryController],
    providers: [{ provide: InquiryAbstractSvc, useClass: InquiryService }]
})
export class InquiryModule { }
