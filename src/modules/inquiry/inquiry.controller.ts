import { Body, Controller, Post, Req } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Authorize } from '@app/core/decorators/authorization.decorator';
import { AppResponse } from '@app/shared/appresponse.shared';
import { CreateInquiryDto } from './dto/inquiry.dto';
import { InquiryAbstractSvc } from './inquiry.abstract';

@Controller('inquiries')
@ApiTags('Inquiry')
export class InquiryController {
    constructor(private readonly _inquirySvc: InquiryAbstractSvc) { }

    @Authorize()
    @Post()
    @ApiOperation({ summary: 'Create a new inquiry for a property' })
    async create(@Body() createInquiryInfo: CreateInquiryDto, @Req() req: any): Promise<AppResponse> {
        return this._inquirySvc.createInquiry(createInquiryInfo, req.claims);
    }
}
