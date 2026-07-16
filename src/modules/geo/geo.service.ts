import { HttpStatus, Injectable } from '@nestjs/common';
import { AppConfigService } from '@app/config/appconfig.service';
import AppLogger from '@app/core/logger/app-logger';
import { AppResponse, createResponse } from '@app/shared/appresponse.shared';
import { messages } from '@app/shared/messages.shared';
import { GeoAbstractSvc } from './geo.abstract';
import { PlaceSuggestion, ReverseGeocodeDto, SuggestPlacesDto } from './dto/geo.dto';

const TOKEN_URL = 'https://outpost.mappls.com/api/security/oauth/token';
const SUGGEST_URL = 'https://atlas.mappls.com/api/places/search/json';
const REVERSE_URL = 'https://apis.mappls.com/advancedmaps/v1';

// Server-side proxy for Mappls (MapmyIndia). Exists so the Atlas OAuth secret
// never reaches the browser, the token is fetched/cached in one place, and the
// provider can be swapped without touching the frontend contract.
@Injectable()
export class GeoService implements GeoAbstractSvc {
	private readonly _clientId: string;
	private readonly _clientSecret: string;
	private readonly _restKey: string;
	private _token?: { value: string; expiresAtMs: number };

	constructor(
		private readonly _appConfigSvc: AppConfigService,
		readonly _loggerSvc: AppLogger
	) {
		const { clientId, clientSecret, restKey } = this._appConfigSvc.get('mappls');
		this._clientId = clientId;
		this._clientSecret = clientSecret;
		this._restKey = restKey;
	}

	async suggest(query: SuggestPlacesDto): Promise<AppResponse> {
		try {
			const token = await this._getToken();
			const params = new URLSearchParams({ query: query.q, region: 'IND' });
			// Bias results towards the caller's area (e.g. the selected city) when known.
			if (query.latitude !== undefined && query.longitude !== undefined) {
				params.set('location', `${query.latitude},${query.longitude}`);
			}
			const res = await fetch(`${SUGGEST_URL}?${params.toString()}`, {
				headers: { Authorization: `bearer ${token}` }
			});
			if (!res.ok) {
				// A stale/revoked token is the one recoverable case — refresh and retry once.
				if (res.status === 401) {
					this._token = undefined;
					return this.suggest(query);
				}
				throw new Error(`Mappls suggest failed: HTTP ${res.status}`);
			}
			const body: any = await res.json();
			const suggestions: PlaceSuggestion[] = (body?.suggestedLocations ?? [])
				.filter((s: any) => s && s.eLoc)
				.map((s: any) => ({
					name: s.placeName ?? '',
					address: s.placeAddress ?? '',
					eLoc: s.eLoc,
					// Present only on some plans/response types; the map SDK resolves
					// the eLoc client-side when these are absent.
					latitude: typeof s.latitude === 'number' ? s.latitude : undefined,
					longitude: typeof s.longitude === 'number' ? s.longitude : undefined
				}));
			return createResponse(HttpStatus.OK, messages.G1, suggestions);
		} catch (error: any) {
			this._loggerSvc.error(error, HttpStatus.INTERNAL_SERVER_ERROR);
			return createResponse(HttpStatus.SERVICE_UNAVAILABLE, messages.G3);
		}
	}

	async reverse(query: ReverseGeocodeDto): Promise<AppResponse> {
		try {
			const url = `${REVERSE_URL}/${this._restKey}/rev_geocode?lat=${query.latitude}&lng=${query.longitude}`;
			const res = await fetch(url);
			if (!res.ok) throw new Error(`Mappls rev_geocode failed: HTTP ${res.status}`);
			const body: any = await res.json();
			const top = body?.results?.[0];
			return createResponse(HttpStatus.OK, messages.G2, {
				address: top?.formatted_address ?? '',
				locality: top?.locality ?? top?.subLocality ?? '',
				city: top?.city ?? '',
				state: top?.state ?? '',
				pincode: top?.pincode ?? ''
			});
		} catch (error: any) {
			this._loggerSvc.error(error, HttpStatus.INTERNAL_SERVER_ERROR);
			return createResponse(HttpStatus.SERVICE_UNAVAILABLE, messages.G3);
		}
	}

	// Map SDK credentials for the (authenticated) browser. The SDK's script loader
	// does NOT accept the Atlas OAuth token (verified: 401 "Token was not
	// recognised") — it needs the public map key via its legacy auth mode. The key
	// is domain-restricted in the Mappls console; the client SECRET is what must
	// never leave the server.
	async mapToken(): Promise<AppResponse> {
		try {
			const token = await this._getToken();
			return createResponse(HttpStatus.OK, messages.G4, {
				accessToken: token,
				mapKey: this._restKey,
				expiresAtMs: this._token?.expiresAtMs ?? Date.now()
			});
		} catch (error: any) {
			this._loggerSvc.error(error, HttpStatus.INTERNAL_SERVER_ERROR);
			return createResponse(HttpStatus.SERVICE_UNAVAILABLE, messages.G3);
		}
	}

	// Client-credentials token, cached until shortly before expiry (mirrors the
	// cached read-SAS pattern in BlobStorageService).
	private async _getToken(): Promise<string> {
		const now = Date.now();
		if (this._token && this._token.expiresAtMs - now > 60 * 1000) {
			return this._token.value;
		}
		const res = await fetch(TOKEN_URL, {
			method: 'POST',
			headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
			body: new URLSearchParams({
				grant_type: 'client_credentials',
				client_id: this._clientId,
				client_secret: this._clientSecret
			}).toString()
		});
		if (!res.ok) throw new Error(`Mappls token request failed: HTTP ${res.status}`);
		const body: any = await res.json();
		if (!body?.access_token) throw new Error('Mappls token response missing access_token');
		this._token = {
			value: body.access_token,
			expiresAtMs: now + Number(body.expires_in ?? 3600) * 1000
		};
		return this._token.value;
	}
}
