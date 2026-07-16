import { Injectable } from '@nestjs/common';
import {
	BlobServiceClient,
	BlobSASPermissions,
	ContainerSASPermissions,
	SASProtocol,
	StorageSharedKeyCredential,
	generateBlobSASQueryParameters
} from '@azure/storage-blob';
import { AppConfigService } from '@app/config/appconfig.service';

export type MediaKind = 'image' | 'video';

export interface UploadSas {
	uploadUrl: string; // blob URL + SAS — the browser PUTs the file here
	blobUrl: string; // clean URL for persistence/display
	blobPath: string; // blob name within the container (used for deletion)
	expiresOn: string;
}

@Injectable()
export class BlobStorageService {
	private readonly _client: BlobServiceClient;
	private readonly _credential: StorageSharedKeyCredential;
	private readonly _container: string;
	private readonly _sasTtlMinutes: number;
	private readonly _videoSasTtlMinutes: number;
	private readonly _readSasTtlMinutes: number;
	private readonly _corsAllowedOrigins: string[];
	private _containerReady = false;
	private _corsReady = false;
	private _readSas?: { suffix: string; expiresAtMs: number };

	constructor(private readonly _appConfigSvc: AppConfigService) {
		const { connectionString, mediaContainer, sasTtlMinutes, videoSasTtlMinutes, readSasTtlMinutes } =
			this._appConfigSvc.get('blobStorage');
		this._client = BlobServiceClient.fromConnectionString(connectionString);
		// A connection string with an account key yields a shared-key credential we can sign SAS with.
		this._credential = this._client.credential as StorageSharedKeyCredential;
		this._container = mediaContainer;
		this._sasTtlMinutes = sasTtlMinutes;
		this._videoSasTtlMinutes = videoSasTtlMinutes;
		this._readSasTtlMinutes = readSasTtlMinutes;
		// Origins allowed to upload/read blobs directly from the browser. Falls back
		// to the API's CORS_ORIGINS so both layers stay in sync in most deployments.
		this._corsAllowedOrigins = (process.env.AZURE_MEDIA_CORS_ORIGINS ?? process.env.CORS_ORIGINS ?? '')
			.split(',')
			.map((o) => o.trim())
			.filter(Boolean);
	}

	// The browser uploads (PUT) and reads (GET) blobs directly against
	// *.blob.core.windows.net, so the STORAGE ACCOUNT — not just the API server —
	// must allow those cross-origin requests. Without this, SAS is granted but the
	// browser's preflight/PUT is blocked. Runs once, before the first upload.
	private async _ensureCors(): Promise<void> {
		if (this._corsReady) return;
		const allowedOrigins = this._corsAllowedOrigins.length ? this._corsAllowedOrigins.join(',') : '*';
		await this._client.setProperties({
			cors: [
				{
					allowedOrigins,
					allowedMethods: 'GET,HEAD,PUT,OPTIONS',
					allowedHeaders: '*',
					exposedHeaders: '*',
					maxAgeInSeconds: 3600
				}
			]
		});
		this._corsReady = true;
	}

	// Creates the media container on first use. Kept PRIVATE — the account disallows
	// public blob access — so reads go through short-lived read-SAS URLs instead.
	private async _ensureContainer(): Promise<void> {
		if (this._containerReady) return;
		const containerClient = this._client.getContainerClient(this._container);
		await containerClient.createIfNotExists();
		this._containerReady = true;
	}

	// A cached, container-scoped read SAS appended to blob URLs so the browser can
	// display private media. Refreshed shortly before it expires.
	async getReadSasSuffix(): Promise<string> {
		const now = Date.now();
		if (this._readSas && this._readSas.expiresAtMs - now > 5 * 60 * 1000) {
			return this._readSas.suffix;
		}
		const startsOn = new Date(now - 5 * 60 * 1000);
		const expiresOn = new Date(now + this._readSasTtlMinutes * 60 * 1000);
		const suffix = generateBlobSASQueryParameters(
			{
				containerName: this._container,
				permissions: ContainerSASPermissions.parse('r'),
				startsOn,
				expiresOn,
				protocol: SASProtocol.Https
			},
			this._credential
		).toString();
		this._readSas = { suffix, expiresAtMs: expiresOn.getTime() };
		return suffix;
	}

	withReadSas(url: string | null | undefined, suffix: string): string | null | undefined {
		if (!url) return url;
		return url.includes('?') ? `${url}&${suffix}` : `${url}?${suffix}`;
	}

	// Builds the deterministic, server-owned blob path: media/<userId>/<image|video>/<ts>_<name>.
	private _buildBlobPath(userId: string, kind: MediaKind, fileName: string): string {
		const safeName = (fileName || 'file').replace(/[^a-zA-Z0-9._-]/g, '_');
		return `media/${userId}/${kind}/${Date.now()}_${safeName}`;
	}

	async generateUploadSas(
		userId: string,
		kind: MediaKind,
		fileName: string,
		contentType?: string
	): Promise<UploadSas> {
		await this._ensureContainer();
		await this._ensureCors();

		const blobPath = this._buildBlobPath(userId, kind, fileName);
		const blockBlobClient = this._client.getContainerClient(this._container).getBlockBlobClient(blobPath);

		const ttlMinutes = kind === 'video' ? this._videoSasTtlMinutes : this._sasTtlMinutes;
		const now = Date.now();
		const startsOn = new Date(now - 5 * 60 * 1000); // allow for clock skew
		const expiresOn = new Date(now + ttlMinutes * 60 * 1000);

		const sas = generateBlobSASQueryParameters(
			{
				containerName: this._container,
				blobName: blobPath,
				permissions: BlobSASPermissions.parse('cw'), // create + write only
				startsOn,
				expiresOn,
				protocol: SASProtocol.Https,
				contentType
			},
			this._credential
		).toString();

		return {
			uploadUrl: `${blockBlobClient.url}?${sas}`,
			blobUrl: blockBlobClient.url,
			blobPath,
			expiresOn: expiresOn.toISOString()
		};
	}

	async deleteBlob(blobPath: string): Promise<void> {
		if (!blobPath) return;
		const blockBlobClient = this._client.getContainerClient(this._container).getBlockBlobClient(blobPath);
		await blockBlobClient.deleteIfExists();
	}
}
