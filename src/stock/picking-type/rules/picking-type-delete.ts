import { type ObjectRecordEvent } from 'twenty-sdk/define';

import { isStaffDelete } from 'src/shared/triggers/actor';
import { type RecordOperation } from 'src/shared/triggers/batch-events';
import { stillDeletedIds } from 'src/shared/triggers/cascade-restore';
import { type ErrorCollector } from 'src/shared/triggers/retry-on-conflict';
import { type PickingTypeEventRecord } from 'src/stock/picking-type/types/picking-type-event-record.type';
import { anyRowWhere } from 'src/stock/stock-exists';
import { RESTRICT_DELETE_MESSAGE } from 'src/stock/stock-messages';
import { restoreForEvent } from 'src/stock/stock-put-back';
import { stockPickingTypes } from 'src/stock/stock-records';
import { destroyWaveLinksOfPickingTypes } from 'src/stock-picking-batch/wave-links';

type PickingTypeEvent = ObjectRecordEvent<PickingTypeEventRecord>;

type PickingTypeDeleteDeps = {
  isUsed: (pickingTypeId: string) => Promise<boolean>;
  putBack: (event: PickingTypeEvent) => Promise<void>;
  stillDeleted: (pickingTypeIds: string[]) => Promise<string[]>;
  destroyWaveLinks: (pickingTypeIds: string[]) => Promise<void>;
};

const OBJECT = { objectSingular: 'stockPickingType', objectPlural: 'stockPickingTypes' } as const;

// A move keeps its type id after the delete and reads it as empty. A rule,
// archived or not, needs its type to make transfers. Wave links go for good,
// so they go only for a type whose put-back check ran and left it deleted: a
// check that failed may still have to put the type back.
export const makeHandlePickingTypeDeletes =
  (deps: PickingTypeDeleteDeps) => async (events: PickingTypeEvent[], operation: RecordOperation, errors: ErrorCollector) => {
    if (operation !== 'deleted') {
      return;
    }
    const unsettled = new Set<string>();

    for (const event of events.filter((candidate) => isStaffDelete(candidate))) {
      await errors.run(event.recordId, async () => {
        try {
          if (await deps.isUsed(event.recordId)) {
            await deps.putBack(event);
          }
        } catch (error) {
          unsettled.add(event.recordId);
          throw error;
        }
      });
    }
    const settled = [...new Set(events.map((event) => event.recordId))].filter((id) => !unsettled.has(id));

    await errors.run('wave links', async () => deps.destroyWaveLinks(await deps.stillDeleted(settled)));
  };

export const handlePickingTypeDeletes = makeHandlePickingTypeDeletes({
  isUsed: async (pickingTypeId) =>
    (await anyRowWhere('stockPicking', 'stockPickings', { pickingTypeId: { eq: pickingTypeId } })) ||
    anyRowWhere('stockRule', 'stockRules', { pickingTypeId: { eq: pickingTypeId } }),
  putBack: (event) => restoreForEvent({ ...OBJECT, event, message: RESTRICT_DELETE_MESSAGE }),
  stillDeleted: (pickingTypeIds) => stillDeletedIds(stockPickingTypes, pickingTypeIds),
  destroyWaveLinks: destroyWaveLinksOfPickingTypes,
});
