import { HttpStatus, Injectable } from '@nestjs/common';
import { MediaAbstractSvc } from './media.abstract';
import { GetSasTokenDto } from './dto/media.dto';
import { BlobStorageService } from '@app/core/azure/blob-storage.service';
import { DatabaseService } from '@app/database/database.service';
import { AppConfigService } from '@app/config/appconfig.service';
import { AppResponse, createResponse } from '@app/shared/appresponse.shared';
import { messages } from '@app/shared/messages.shared';
import { AtPayload } from '@app/shared/models.shared';
import AppLogger from '@app/core/logger/app-logger';

@Injectable()
export class MediaService implements MediaAbstractSvc {
	constructor(
		private readonly _blobSvc: BlobStorageService,
		private readonly _dbSvc: DatabaseService,
		private readonly _appConfigSvc: AppConfigService,
		private readonly _loggerSvc: AppLogger
	) {}

	async getSasToken(info: GetSasTokenDto, claims: AtPayload): Promise<AppResponse> {
		try {
			const { userQuotaBytes } = this._appConfigSvc.get('blobStorage');
			const used = await this._dbSvc.userSqlTxn.getMediaUsage(claims.sub);

			// Fast fail before handing out a token if this file would blow the quota.
			if (used + info.sizeBytes > userQuotaBytes) {
				// 413 (not 403) so the UI's global 403-redirect interceptor doesn't fire.
				return createResponse(HttpStatus.PAYLOAD_TOO_LARGE, messages.MED2, {
					usedBytes: used,
					quotaBytes: userQuotaBytes
				});
			}

			// userId is taken from the token, never the client.
			const sas = await this._blobSvc.generateUploadSas(claims.sub, info.mediaType, info.fileName, info.contentType);
			return createResponse(HttpStatus.OK, messages.MED1, sas);
		} catch (error: any) {
			this._loggerSvc.error(error, HttpStatus.INTERNAL_SERVER_ERROR, claims?.sid);
			return createResponse(HttpStatus.INTERNAL_SERVER_ERROR, messages.E2);
		}
	}

	async getUsage(claims: AtPayload): Promise<AppResponse> {
		try {
			const { userQuotaBytes } = this._appConfigSvc.get('blobStorage');
			const used = await this._dbSvc.userSqlTxn.getMediaUsage(claims.sub);
			return createResponse(HttpStatus.OK, messages.MED3, { usedBytes: used, quotaBytes: userQuotaBytes });
		} catch (error: any) {
			this._loggerSvc.error(error, HttpStatus.INTERNAL_SERVER_ERROR, claims?.sid);
			return createResponse(HttpStatus.INTERNAL_SERVER_ERROR, messages.E2);
		}
	}
}
