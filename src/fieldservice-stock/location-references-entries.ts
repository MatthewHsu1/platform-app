import { LOCATION_REFERENCES } from 'src/stock/location/rules/location-delete';

// A stock location that a service location names as its own cannot be deleted.
LOCATION_REFERENCES.push({ objectSingular: 'fsmLocation', objectPlural: 'fsmLocations', fields: ['inventoryLocationId'] });
