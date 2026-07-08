import { RoleType } from '@app/core/enums/app-role.enum';
import { Role, RoleColumns, Amenity, AmenityColumns, City, CityColumns } from '../models';

// Master data for the Roles table, derived from the RoleType enum so the database
// and the compile-time contract can never drift. Seeding is idempotent.
const ROLE_SEED: { code: RoleType; name: string; description: string }[] = [
	{ code: RoleType.SEEKER, name: 'Seeker', description: 'Browses and inquires about properties' },
	{ code: RoleType.OWNER, name: 'Property Owner', description: 'Lists and manages their own properties' },
	{ code: RoleType.AGENT, name: 'Agent', description: 'Manages listings on behalf of owners' },
	{ code: RoleType.ADMIN, name: 'Administrator', description: 'Full administrative access' }
];

export const seedRoles = async (): Promise<void> => {
	for (const role of ROLE_SEED) {
		await Role.findOrCreate({
			where: { [RoleColumns.Code]: role.code },
			defaults: {
				[RoleColumns.Code]: role.code,
				[RoleColumns.Name]: role.name,
				[RoleColumns.Description]: role.description
			} as any
		});
	}
};

// A starter set of common amenities so the master table / dropdown is usable
// immediately. New amenities are still created on demand when a property is saved.
const AMENITY_SEED = [
	'WiFi',
	'Parking',
	'Furnished',
	'Air Conditioning',
	'Power Backup',
	'Lift',
	'Security',
	'Water Supply',
	'Gym',
	'Swimming Pool'
];

export const seedAmenities = async (): Promise<void> => {
	for (const name of AMENITY_SEED) {
		await Amenity.findOrCreate({
			where: { [AmenityColumns.Name]: name },
			defaults: { [AmenityColumns.Name]: name } as any
		});
	}
};

// A few major cities to bootstrap the Cities master table. Cities are otherwise
// created on demand from the city name supplied when a property is listed.
const CITY_SEED: { name: string; state: string }[] = [
	{ name: 'Mumbai', state: 'Maharashtra' },
	{ name: 'Delhi', state: 'Delhi' },
	{ name: 'Bengaluru', state: 'Karnataka' },
	{ name: 'Hyderabad', state: 'Telangana' },
	{ name: 'Chennai', state: 'Tamil Nadu' },
	{ name: 'Pune', state: 'Maharashtra' },
	{ name: 'Kolkata', state: 'West Bengal' },
	{ name: 'Ahmedabad', state: 'Gujarat' }
];

export const seedCities = async (): Promise<void> => {
	for (const city of CITY_SEED) {
		await City.findOrCreate({
			where: { [CityColumns.Name]: city.name },
			defaults: { [CityColumns.Name]: city.name, [CityColumns.State]: city.state } as any
		});
	}
};
