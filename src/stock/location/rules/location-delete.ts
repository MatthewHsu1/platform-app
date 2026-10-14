import { type ObjectRecordEvent } from 'twenty-sdk/define';

import { type RecordOperation } from 'src/shared/triggers/batch-events';
import { isStaffDelete } from 'src/shared/triggers/actor';
import { type ErrorCollector } from 'src/shared/triggers/retry-on-conflict';
import { type LocationEventRecord } from 'src/stock/location/types/location-event-record.type';
import { eventBefore } from 'src/stock/stock-event-helpers';
import { findSome } from 'src/stock/stock-exists';
import { RESTRICT_DELETE_MESSAGE } from 'src/stock/stock-messages';
import { restoreForEvent } from 'src/stock/stock-put-back';
import { stockLocations } from 'src/stock/stock-records';
import { planLocationDelete, subtreeIds } from 'src/stock/utils/plan-location-rules.util';

const OBJECT = { objectSingular: 'stockLocation', objectPlural: 'stockLocations' } as const;

// Every object whose location fields restrict a delete. Other modules add their own rows at load time.
export const LOCATION_REFERENCES: { objectSingular: string; objectPlural: string; fields: string[] }[] = [
  { objectSingular: 'stockQuant', objectPlural: 'stockQuants', fields: ['locationId'] },
  { objectSingular: 'stockMove', objectPlural: 'stockMoves', fields: ['locationId', 'locationDestId'] },
  { objectSingular: 'stockMoveLine', objectPlural: 'stockMoveLines', fields: ['locationId', 'locationDestId'] },
  { objectSingular: 'stockScrap', objectPlural: 'stockScraps', fields: ['locationId', 'scrapLocationId'] },
  { objectSingular: 'stockPicking', objectPlural: 'stockPickings', fields: ['locationId', 'locationDestId'] },
  {
    objectSingular: 'stockPickingType',
    objectPlural: 'stockPickingTypes',
    fields: ['defaultLocationSrcId', 'defaultLocationDestId'],
  },
  { objectSingular: 'stockWarehouse', objectPlural: 'stockWarehouses', fields: ['viewLocationId', 'lotStockId'] },
  { objectSingular: 'stockRule', objectPlural: 'stockRules', fields: ['locationDestId'] },
];

const usedLocationIdsAmong = async (locationIds: string[]) => {
  const used = new Set<string>();

  for (const reference of LOCATION_REFERENCES) {
    const rows = await findSome<Record<string, string | null>>(
      reference.objectSingular,
      reference.objectPlural,
      { or: reference.fields.map((field) => ({ [field]: { in: locationIds } })) },
      reference.fields.join(' '),
    );

    for (const row of rows) {
      for (const field of reference.fields) {
        const value = row[field];

        if (value !== null && locationIds.includes(value)) {
          used.add(value);
        }
      }
    }
  }

  return [...used];
};

// A staff delete takes the subtree with it unless something still uses
// any location of it. The app's own deletes are this cascade coming back.
export const handleLocationDeletes = async (
  events: ObjectRecordEvent<LocationEventRecord>[],
  operation: RecordOperation,
  errors: ErrorCollector,
) => {
  if (operation !== 'deleted') {
    return;
  }
  const staffEvents = events.filter((event) => isStaffDelete(event));

  if (staffEvents.length === 0) {
    return;
  }
  const rows = await stockLocations.find<{ id: string; locationId: string | null }>({}, 'id locationId');

  for (const event of staffEvents) {
    const before = eventBefore(event);

    await errors.run(event.recordId, async () => {
      const tree = [...rows, { id: event.recordId, locationId: before?.locationId ?? null }];
      const plan = planLocationDelete({
        deletedId: event.recordId,
        rows: tree,
        usedLocationIds: await usedLocationIdsAmong(subtreeIds(event.recordId, tree)),
      });

      if (plan.kind === 'refuse') {
        await restoreForEvent({ ...OBJECT, event, message: RESTRICT_DELETE_MESSAGE });
        return;
      }
      if (plan.childIds.length > 0) {
        await stockLocations.softDeleteMany(plan.childIds);
      }
    });
  }
};
