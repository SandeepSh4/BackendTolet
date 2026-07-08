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

	// Cities / Amenities (master data)
	C1: 'Cities fetched successfully',
	M1: 'Amenities fetched successfully',

	// Property
	P1: 'Property created successfully',
	P2: 'Properties fetched successfully',
	P3: 'Property updated successfully',
	P4: 'Property deleted successfully',
	P5: 'Property not found'
};

export const messageFactory = (template: string, args: any[]): string => {
	return args.reduce((msg, arg, i) => msg.replace(`{${i}}`, arg), template);
};
