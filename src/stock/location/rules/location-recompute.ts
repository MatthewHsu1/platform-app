import { type ObjectRecordEvent } from 'twenty-sdk/define';

import { type RecordOperation } from 'src/shared/triggers/batch-events';
import { isApplicationWrite } from 'src/shared/triggers/actor';
import { type ErrorCollector } from 'src/shared/triggers/retry-on-conflict';
import { readLocations } from 'src/stock/location/read-locations';
import { recomputeLocation } from 'src/stock/location/recompute-location';
import { type LocationEventRecord } from 'src/stock/location/types/location-event-record.type';
import { eventAfter, eventChangedFields } from 'src/stock/stock-event-helpers';
import { stockLocations, stockQuants } from 'src/stock/stock-records';
import { LOCATION_ROW } from 'src/stock/stock-rows';
import { readStockSettings, todayUtc } from 'src/stock/stock-settings';
import { nextCountDate } from 'src/stock/utils/next-count-date.util';
import { planActiveCascade } from 'src/stock/utils/plan-location-rules.util';
import { type LocationRow } from 'src/stock/types/location-row.type';

// Recomputed paths and names, and the archive cascade. The cascade runs for the app's own archive
// too: the warehouse reconciler archives a view location and its children follow.
export const handleLocationRecompute = async (
  events: ObjectRecordEvent<LocationEventRecord>[],
  operation: RecordOperation,
  errors: ErrorCollector,
) => {
  if (operation !== 'created' && operation !== 'updated') {
    return;
  }
  const treeIds: string[] = [];
  const frequencyIds: string[] = [];
  const activeEvents: ObjectRecordEvent<LocationEventRecord>[] = [];

  for (const event of events) {
    const after = eventAfter(event);

    if (after === undefined) {
      continue;
    }
    const byApp = isApplicationWrite(after);

    if (operation === 'created') {
      if (!byApp) {
        treeIds.push(event.recordId);
      }
      continue;
    }
    const changed = eventChangedFields(event, ['name', 'locationId', 'usage', 'cyclicInventoryFrequency', 'lastInventoryDate', 'active']);

    if (!byApp && changed.some((field) => field === 'name' || field === 'locationId' || field === 'usage')) {
      treeIds.push(event.recordId);
    }
    if (!byApp && (changed.includes('cyclicInventoryFrequency') || changed.includes('lastInventoryDate'))) {
      frequencyIds.push(event.recordId);
    }
    if (changed.includes('active')) {
      activeEvents.push(event);
    }
  }

  const recomputeIds = [...new Set([...treeIds, ...frequencyIds])];

  if (recomputeIds.length > 0) {
    await errors.run('recompute locations', () => recomputeLocation(recomputeIds));
  }
  if (frequencyIds.length > 0) {
    await errors.run('count dates', async () => {
      const settings = readStockSettings();
      const today = todayUtc();
      const locations = await readLocations(frequencyIds);

      for (const location of locations.values()) {
        const date = nextCountDate({
          usage: location.usage,
          nextInventoryDate: location.nextInventoryDate,
          today,
          annualInventoryMonth: settings.annualInventoryMonth,
          annualInventoryDay: settings.annualInventoryDay,
        });
        const quants = await stockQuants.find<{ id: string }>(
          { locationId: { eq: location.id }, inventoryDate: { is: 'NULL' } },
          'id',
        );

        if (date !== null && quants.length > 0) {
          await stockQuants.updateMany(
            quants.map((quant) => quant.id),
            { inventoryDate: date },
          );
        }
      }
    });
  }
  if (activeEvents.length > 0) {
    const rows = await stockLocations.find<LocationRow>({}, LOCATION_ROW);
    const byId = new Map(rows.map((row) => [row.id, row]));

    for (const event of activeEvents) {
      const stored = byId.get(event.recordId);
      const after = eventAfter(event);

      if (stored === undefined || after === undefined || stored.active !== after.active) {
        continue;
      }
      await errors.run(event.recordId, async () => {
        const ids = planActiveCascade({ rootId: stored.id, active: stored.active, rows });

        if (ids.length > 0) {
          await stockLocations.updateMany(ids, { active: stored.active });
        }
      });
    }
  }
};
