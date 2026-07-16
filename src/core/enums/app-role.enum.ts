export enum RoleType {
	SEEKER = 'SEEKER',
	OWNER = 'OWNER',
	AGENT = 'AGENT',
	ADMIN = 'ADMIN'
}

export const RoleGroup = {
	ADMIN_ONLY: [RoleType.ADMIN],
	OWNER_ONLY: [RoleType.OWNER],
	AGENT_ONLY: [RoleType.AGENT],
	SEEKER_ONLY: [RoleType.SEEKER],
	OWNER_AGENT: [RoleType.OWNER, RoleType.AGENT],
	OWNER_ADMIN: [RoleType.OWNER, RoleType.ADMIN],
	ALL_ROLES: [RoleType.SEEKER, RoleType.OWNER, RoleType.AGENT, RoleType.ADMIN]
};
