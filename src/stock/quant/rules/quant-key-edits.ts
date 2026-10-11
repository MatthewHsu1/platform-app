import { type ObjectRecordEvent } from 'twenty-sdk/define';

import { isApplicationWrite } from 'src/shared/triggers/actor';
import { type RecordOperation } from 'src/shared/triggers/batch-events';
import { type ErrorCollector } from 'src/shared/triggers/retry-on-conflict';
import { readLocations } from 'src/stock/location/read-locations';
import { type QuantEventRecord } from 'src/stock/quant/types/quant-event-record.type';
import { LOCATION_USAGE } from 'src/stock/stock-options.constant';
import { eventAfter, eventBefore } from 'src/stock/stock-event-helpers';
import { putBackForEvent } from 'src/stock/stock-put-back';
import { stockQuants } from 'src/stock/stock-records';
import { planQuantKeyEdit } from 'src/stock/utils/plan-quant-count.util';

const OBJECT = { objectSingular: 'stockQuant', objectPlural: 'stockQuants' } as const;

// A key field the user changed goes back; on an inventory loss location with no note.
export const handleQuantKeyEdits = async (
  events: ObjectRecordEvent<QuantEventRecord>[],
  operation: RecordOperation,
  errors: ErrorCollector,
) => {
  if (operation !== 'updated') {
    return;
  }
  const staffEvents = events.filter((event) => eventBefore(event) !== undefined && !isApplicationWrite(eventAfter(event)));

  if (staffEvents.length === 0) {
    return;
  }
  const locations = await readLocations(
    staffEvents.flatMap((event) => {
      const before = eventBefore(event);

      return before === undefined ? [] : [before.locationId];
    }),
  );
  const stored = await stockQuants.find<{
    id: string;
    productId: string;
    locationId: string;
    lotId: string | null;
    packageId: string | null;
    ownerId: string | null;
  }>({ id: { in: staffEvents.map((event) => event.recordId) } }, 'id productId locationId lotId packageId ownerId');

  for (const event of staffEvents) {
    const before = eventBefore(event);
    const current = stored.find((row) => row.id === event.recordId);
    const usage = before === undefined ? undefined : locations.get(before.locationId)?.usage;

    if (before === undefined || current === undefined) {
      continue;
    }
    await errors.run(event.recordId, async () => {
      // A location that cannot be read is not an inventory loss location: the edit goes back with a note.
      const plan = planQuantKeyEdit({ before, after: current, beforeLocationUsage: usage ?? LOCATION_USAGE.INTERNAL });

      if (plan === null) {
        return;
      }
      if (plan.withNote) {
        await putBackForEvent({ ...OBJECT, event, data: plan.data, message: plan.reason });
      } else {
        await stockQuants.update(event.recordId, plan.data);
      }
    });
  }
};
