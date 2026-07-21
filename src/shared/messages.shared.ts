export const messages = {
	// Success
	S1: 'Server started on port: {0}',
	S2: 'Database connected successfully',
	S3: 'MSSQL connected successfully',

	// Errors
	E1: 'Server failed to start: {0}',
	E2: 'Internal server error',
	E3: 'Unauthorized access',
	E4: 'Database connection failed: {0}',
	E5: 'Database connection closed',
	E6: 'Error closing database connection: {0}',
	E7: 'Access forbidden for {0}',

	// Warnings / Validation
	W1: '{0} is invalid',
	W2: '{0} should not be empty',
	W4: '{0} must be a number',
	W5: '{0} must not exceed {1} characters',
	W10: 'At least one {0} is required',

	// Auth
	A1: 'Login successful',
	A2: 'Logout successful',
	A3: 'Invalid credentials',
	A4: 'Email already in use',
	A5: 'Admin accounts cannot be self-registered',
	A6: 'Access denied',
	A7: 'Access Token Generated',
	A8: 'Refresh token expired. Login again.',
	A9: 'Invalid refresh token',
	A10: 'Registration successful',
	A11: 'Session expired or revoked. Login again.',
	A12: 'Logged out from all devices',
	A13: 'Sessions fetched successfully',

	// User Management
	U1: 'Users fetched successfully',
	U2: 'User created successfully',
	U3: 'User updated successfully',
	U4: 'User deleted successfully',
	U5: 'User not found',
	U6: 'User already exists with this email',
	U7: 'User fetched successfully',

	// Cities / Amenities / Property types (master data)
	C1: 'Cities fetched successfully',
	M1: 'Amenities fetched successfully',
	PT1: 'Property types fetched successfully',

	// Media
	MED1: 'Upload authorized',
	MED2: 'Storage quota exceeded. Delete some media to free up space.',
	MED3: 'Media usage fetched',
	PM1: 'Media added successfully',
	PM2: 'Media reordered successfully',
	PM3: 'Media deleted successfully',
	PM4: 'Media not found',

	// Property
	P1: 'Property created successfully',
	P2: 'Properties fetched successfully',
	P3: 'Property updated successfully',
	P4: 'Property deleted successfully',
	P5: 'Property not found',

	// Listings
	L1: '{0} listings are not allowed for property type {1}',
	L2: 'Duplicate {0} listing — a property can carry only one listing per type',
	L3: 'At least one listing or a rent amount is required',

	// Geo (Mappls proxy)
	G1: 'Place suggestions fetched',
	G2: 'Address resolved',
	G3: 'Geocoding service unavailable',
	G4: 'Map token issued',

	// Property applications
	AP1: 'Application submitted successfully',
	AP2: 'Applications fetched successfully',
	AP3: 'Application accepted',
	AP4: 'Application rejected',
	AP5: 'Application withdrawn',
	AP6: 'Application not found',
	AP7: 'You already have an active application for this property',
	AP8: 'You cannot apply for your own property',
	AP9: 'Complete KYC verification before applying',
	AP10: 'Only pending applications can be {0}',

	// Notifications
	N1: 'Notifications fetched successfully',
	N2: 'Notifications marked as read',

	// Chat
	CH1: 'Conversation ready',
	CH2: 'Conversations fetched successfully',
	CH3: 'Messages fetched successfully',
	CH4: 'Message sent',
	CH5: 'Conversation not found',
	CH6: 'Chat unlocks after the application is accepted',
	CH7: 'Message cannot be empty',
	CH8: 'You are sending messages too quickly — slow down'
};

export const messageFactory = (template: string, args: any[]): string => {
	return args.reduce((msg, arg, i) => msg.replace(`{${i}}`, arg), template);
};
