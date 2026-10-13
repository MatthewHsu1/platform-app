import { type ObjectRecordEvent } from 'twenty-sdk/define';

import { type LocationEventRecord } from 'src/stock/location/types/location-event-record.type';
import { translate } from 'src/shared/i18n/translate';
import { type RecordOperation } from 'src/shared/triggers/batch-events';
import { type ErrorCollector } from 'src/shared/triggers/retry-on-conflict';
import { eventAfter, eventBefore, eventChangedFields, isStaffEvent, localizedReason } from 'src/stock/stock-event-helpers';
import { putBackForEvent } from 'src/stock/stock-put-back';
import { stockLocations, stockQuants, stockWarehouses } from 'src/stock/stock-records';
import { LOCATION_ROW, WAREHOUSE_ROW } from 'src/stock/stock-rows';
import {
  isOwnAncestor,
  LOCATION_RECURSION_MESSAGE,
  locationArchiveRefusal,
  locationUsageRefusal,
  replenishConflict,
  subtreeIds,
} from 'src/stock/utils/plan-location-rules.util';
import { type LocationRow } from 'src/stock/types/location-row.type';
import { type WarehouseRow } from 'src/stock/types/warehouse-row.type';

const OBJECT = { objectSingular: 'stockLocation', objectPlural: 'stockLocations' } as const;
const REPLENISH_FIELDS = ['replenishLocation', 'locationId', 'usage'] as const;

export const locationArchiveRefusalFor = async (locationId: string) => {
  const rows = await stockLocations.find<LocationRow>({}, LOCATION_ROW);
  const location = rows.find((row) => row.id === locationId);

  if (location === undefined) {
    return null;
  }
  const subtree = subtreeIds(locationId, rows);
  const [warehouses, quants] = await Promise.all([
    stockWarehouses.find<WarehouseRow>({}, WAREHOUSE_ROW),
    stockQuants.find<{ locationId: string; quantity: number; reservedQuantity: number }>(
      { locationId: { in: subtree } },
      'locationId quantity reservedQuantity',
    ),
  ]);

  return locationArchiveRefusal({
    locationId,
    locationName: location.completeName ?? location.name ?? '',
    rows,
    warehouses,
    quants,
  });
};

// The reconciler's archive check: only the stock part applies there (the
// warehouse being rebuilt is the one that uses its own locations).
export const refuseLocationArchive = async (locationIds: string[]) => {
  const rows = await stockLocations.find<LocationRow>({}, LOCATION_ROW);

  for (const locationId of locationIds) {
    const location = rows.find((row) => row.id === locationId);

    if (location === undefined) {
      continue;
    }
    const quants = await stockQuants.find<{ locationId: string; quantity: number; reservedQuantity: number }>(
      { locationId: { in: subtreeIds(locationId, rows) } },
      'locationId quantity reservedQuantity',
    );
    const refusal = locationArchiveRefusal({
      locationId,
      locationName: location.completeName ?? location.name ?? '',
      rows,
      warehouses: [],
      quants,
    });

    if (refusal !== null) {
      return translate(null, refusal.message, refusal.values);
    }
  }

  return null;
};

// Refusals in the order a location write is checked. A put-back
// is skipped when the stored value no longer matches the event (another save came after).
export const handleLocationRefusals = async (
  events: ObjectRecordEvent<LocationEventRecord>[],
  operation: RecordOperation,
  errors: ErrorCollector,
) => {
  if (operation !== 'updated' && operation !== 'created') {
    return;
  }
  const staffEvents = events.filter((event) => isStaffEvent(operation, event));

  if (staffEvents.length === 0) {
    return;
  }
  const rows = await stockLocations.find<LocationRow>({}, LOCATION_ROW);
  const byId = new Map(rows.map((row) => [row.id, row]));

  for (const event of staffEvents) {
    const before = eventBefore(event);
    const after = eventAfter(event);
    const stored = byId.get(event.recordId);

    if (after === undefined || stored === undefined) {
      continue;
    }

    await errors.run(event.recordId, async () => {
      if (operation === 'created') {
        const refusal = replenishConflict({ locationId: stored.id, rows });

        if (refusal !== null) {
          // A refused create never existed, so no row is left to carry a note;
          // the reason goes out as the trigger's error instead.
          await stockLocations.destroyMany([stored.id]);
          throw new Error(await localizedReason(event, refusal.message, refusal.values));
        }
        return;
      }
      const changed = eventChangedFields(event, ['locationId', 'usage', 'replenishLocation', 'active']);

      if (before === undefined || changed.length === 0) {
        return;
      }
      if (changed.includes('locationId') && stored.locationId === after.locationId && isOwnAncestor(stored.id, rows)) {
        await putBackForEvent({ ...OBJECT, event, data: { locationId: before.locationId }, message: LOCATION_RECURSION_MESSAGE });
        byId.set(stored.id, { ...stored, locationId: before.locationId });
        return;
      }
      if (changed.includes('usage') && stored.usage === after.usage) {
        const quants = await stockQuants.find<{ quantity: number }>({ locationId: { eq: stored.id } }, 'quantity');
        const refusal = locationUsageRefusal({ beforeUsage: before.usage, afterUsage: after.usage, quants });

        if (refusal !== null) {
          await putBackForEvent({ ...OBJECT, event, data: { usage: before.usage }, ...refusal });
          return;
        }
      }
      const replenishChanged = changed.filter((field) => (REPLENISH_FIELDS as readonly string[]).includes(field));

      if (replenishChanged.length > 0) {
        const refusal = replenishConflict({ locationId: stored.id, rows });

        if (refusal !== null) {
          await putBackForEvent({
            ...OBJECT,
            event,
            data: Object.fromEntries(replenishChanged.map((field) => [field, before[field as keyof LocationRow]])),
            ...refusal,
          });
          return;
        }
      }
      if (changed.includes('active') && !after.active && stored.active === false) {
        const refusal = await locationArchiveRefusalFor(stored.id);

        if (refusal !== null) {
          await putBackForEvent({ ...OBJECT, event, data: { active: true }, ...refusal });
        }
      }
    });
  }
};
