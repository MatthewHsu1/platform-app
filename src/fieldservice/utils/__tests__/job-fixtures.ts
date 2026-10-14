import { type EquipmentRow } from 'src/fieldservice/types/equipment-row.type';
import { type LocationRow } from 'src/fieldservice/types/location-row.type';
import { type OrderRow } from 'src/fieldservice/types/order-row.type';
import { type TeamRow } from 'src/fieldservice/types/team-row.type';

// Shared row builders for the service-job planner tests: each returns a valid
// row, so a test only states the fields its case turns on.
export const orderRow = (values: Partial<OrderRow> = {}): OrderRow => ({
  id: 'order-1',
  stageClosedStatus: 'OPEN',
  workerId: null,
  teamId: null,
  locationId: null,
  scheduledStart: null,
  scheduledEnd: null,
  scheduledDurationHours: 0,
  closed: false,
  ...values,
});

export const locationRow = (values: Partial<LocationRow> = {}): LocationRow => ({
  id: 'location-1',
  parentId: null,
  ref: null,
  name: 'Main site',
  personOwnerId: null,
  companyOwnerId: null,
  ...values,
});

export const equipmentRow = (values: Partial<EquipmentRow> = {}): EquipmentRow => ({
  id: 'equipment-1',
  locationId: null,
  parentId: null,
  serial: null,
  warrantyStart: null,
  warrantyEnd: null,
  ...values,
});

export const teamRow = (values: Partial<TeamRow> = {}): TeamRow => ({
  id: 'team-1',
  name: 'Day shift',
  sequence: 1,
  ...values,
});
