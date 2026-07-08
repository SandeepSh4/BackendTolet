interface AtPayload {
	readonly sub: string;
	readonly email: string;
	readonly role: string;
	readonly name?: string;
	readonly sessionId?: string;
	readonly sid?: string;
}

interface SessionMeta {
	readonly userAgent?: string | null;
	readonly ipAddress?: string | null;
}

export { AtPayload, SessionMeta };
