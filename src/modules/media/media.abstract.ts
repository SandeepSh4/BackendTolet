import { AppResponse } from '@app/shared/appresponse.shared';
import { AtPayload } from '@app/shared/models.shared';
import { GetSasTokenDto } from './dto/media.dto';

export abstract class MediaAbstractSvc {
	abstract getSasToken(info: GetSasTokenDto, claims: AtPayload): Promise<AppResponse>;
	abstract getUsage(claims: AtPayload): Promise<AppResponse>;
}
