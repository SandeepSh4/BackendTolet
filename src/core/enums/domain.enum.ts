export enum KycStatus {
	NONE = 'NONE',
	PENDING = 'PENDING',
	VERIFIED = 'VERIFIED',
	REJECTED = 'REJECTED'
}

export enum AvailabilityStatus {
	AVAILABLE = 'AVAILABLE',
	RESERVED = 'RESERVED',
	UNAVAILABLE = 'UNAVAILABLE'
}

// How a property is offered: one-time sale, recurring rent, or per-night homestay.
export enum ListingType {
	SALE = 'SALE',
	RENT = 'RENT',
	SHORT_STAY = 'SHORT_STAY'
}

// Billing period for RENT listings.
export enum RentPeriod {
	MONTHLY = 'MONTHLY',
	YEARLY = 'YEARLY'
}

export enum MediaType {
	IMAGE = 'IMAGE',
	VIDEO = 'VIDEO'
}

export enum InquiryStatus {
	OPEN = 'OPEN',
	RESPONDED = 'RESPONDED',
	CLOSED = 'CLOSED'
}

export enum AssignmentStatus {
	REQUESTED = 'REQUESTED',
	ASSIGNED = 'ASSIGNED',
	IN_PROGRESS = 'IN_PROGRESS',
	COMPLETED = 'COMPLETED',
	CANCELLED = 'CANCELLED'
}
