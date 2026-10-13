import { type ObjectRecordEvent } from 'twenty-sdk/define';

import { isStaffDelete } from 'src/shared/triggers/actor';
import { type RecordOperation } from 'src/shared/triggers/batch-events';
import { type ErrorCollector } from 'src/shared/triggers/retry-on-conflict';
import { type ScrapEventRecord } from 'src/stock/scrap/types/scrap-event-record.type';
import { SCRAP_STATE } from 'src/stock/stock-options.constant';
import { restoreForEvent } from 'src/stock/stock-put-back';
import { stockScraps } from 'src/stock/stock-records';

export const DONE_SCRAP_DELETE_REASON = 'You cannot delete a scrap which is done.';

// A done scrap deleted by staff comes back.
export const handleScrapDeletes = async (
  events: ObjectRecordEvent<ScrapEventRecord>[],
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
  const stored = await stockScraps.findIncludingDeleted<{ id: string; state: string; deletedAt: string | null }>(
    { id: { in: staffEvents.map((event) => event.recordId) } },
    'id state deletedAt',
  );

  for (const event of staffEvents) {
    const scrap = stored.find((candidate) => candidate.id === event.recordId);

    if (scrap === undefined || scrap.deletedAt === null || scrap.state !== SCRAP_STATE.DONE) {
      continue;
    }
    await errors.run(scrap.id, () =>
      restoreForEvent({
        objectSingular: 'stockScrap',
        objectPlural: 'stockScraps',
        event,
        message: DONE_SCRAP_DELETE_REASON,
      }),
    );
  }
};
