import { type ObjectRecordEvent } from 'twenty-sdk/define';

import { restoreIfStillDeleted } from 'src/shared/triggers/put-back';
import { type Records } from 'src/shared/triggers/records';
import { errorCollector } from 'src/shared/triggers/retry-on-conflict';
import { localizedReason } from 'src/stock/stock-event-helpers';

// A record that orders still name cannot go: such a delete comes back with a note. Archived orders count too.
// Returns the records whose delete stands.
export const refuseUsedDeletes = async ({
  records,
  events,
  users,
  field,
  reason,
}: {
  records: Records;
  events: ObjectRecordEvent<object>[];
  users: Records;
  field: string;
  reason: string;
}) => {
  const ids = [...new Set(events.map((event) => event.recordId))];
  const using = await users.find<Record<string, string | null>>({ [field]: { in: ids } }, field);
  const used = new Set(using.map((row) => row[field]));
  const errors = errorCollector();

  for (const event of events.filter((candidate) => used.has(candidate.recordId))) {
    await errors.run(event.recordId, async () =>
      restoreIfStillDeleted({
        objectSingular: records.objectSingular,
        objectPlural: records.objectPlural,
        recordId: event.recordId,
        reason: await localizedReason(event, reason),
      }),
    );
  }
  errors.throwIfAny();

  return ids.filter((id) => !used.has(id));
};
