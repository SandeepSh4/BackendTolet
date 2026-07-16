import { RoleType } from '@app/core/enums/app-role.enum';
import { Role, RoleColumns, Amenity, AmenityColumns, City, CityColumns, PropertyType, PropertyTypeColumns } from '../models';

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

// Initial property types with their listing-capability matrix: which intents
// (sale / rent / short-stay) each type supports. Drives the owner UI and is
// enforced when listings are created. Admins can add/deactivate more types
// directly in the DB; the flags of THESE seeded rows are code-owned and
// re-asserted on every boot so matrix changes ship with deployments.
const PROPERTY_TYPE_SEED: { name: string; sale: boolean; rent: boolean; shortStay: boolean }[] = [
	{ name: '1RK', sale: false, rent: true, shortStay: false },
	{ name: 'Single Room', sale: false, rent: true, shortStay: false },
	{ name: '1 BHK Apartment', sale: true, rent: true, shortStay: false },
	{ name: '2 BHK Apartment', sale: true, rent: true, shortStay: false },
	{ name: '3 BHK Apartment', sale: true, rent: true, shortStay: false },
	{ name: 'House', sale: true, rent: true, shortStay: false },
	{ name: 'PG', sale: false, rent: true, shortStay: false },
	{ name: 'Hostel', sale: false, rent: true, shortStay: false },
	{ name: 'Home Stay', sale: false, rent: false, shortStay: true },
	{ name: 'Office', sale: true, rent: true, shortStay: false },
	{ name: 'Shop', sale: true, rent: true, shortStay: false },
	{ name: 'Land', sale: true, rent: true, shortStay: false }
];

export const seedPropertyTypes = async (): Promise<void> => {
	for (let i = 0; i < PROPERTY_TYPE_SEED.length; i++) {
		const { name, sale, rent, shortStay } = PROPERTY_TYPE_SEED[i];
		const capabilities = {
			[PropertyTypeColumns.AllowsSale]: sale,
			[PropertyTypeColumns.AllowsRent]: rent,
			[PropertyTypeColumns.AllowsShortStay]: shortStay
		};
		const [row, created] = await PropertyType.findOrCreate({
			where: { [PropertyTypeColumns.Name]: name },
			defaults: { [PropertyTypeColumns.Name]: name, [PropertyTypeColumns.SortOrder]: i, ...capabilities } as any
		});
		if (!created) {
			await row.update(capabilities as any);
		}
	}
};
