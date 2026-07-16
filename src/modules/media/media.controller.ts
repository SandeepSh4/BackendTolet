import { Body, Controller, Get, HttpCode, HttpStatus, Post, Req } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { MediaAbstractSvc } from './media.abstract';
import { GetSasTokenDto } from './dto/media.dto';
import { AppResponse } from '@app/shared/appresponse.shared';
import { Authorize } from '@app/core/decorators/authorization.decorator';

@Controller('media')
@ApiTags('Media')
export class MediaController {
	constructor(private readonly _mediaSvc: MediaAbstractSvc) {}

	@Authorize()
	@HttpCode(HttpStatus.OK)
	@Post('get-sas-token')
	@ApiOperation({ summary: 'Get a short-lived SAS URL to upload a file directly to blob storage' })
	async getSasToken(@Body() info: GetSasTokenDto, @Req() req: any): Promise<AppResponse> {
		return this._mediaSvc.getSasToken(info, req.claims);
	}

	@Authorize()
	@Get('usage')
	@ApiOperation({ summary: 'Get the current user\'s media storage usage vs quota' })
	async usage(@Req() req: any): Promise<AppResponse> {
		return this._mediaSvc.getUsage(req.claims);
	}
}
