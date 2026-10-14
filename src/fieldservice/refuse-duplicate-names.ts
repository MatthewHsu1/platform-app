import { type ObjectRecordEvent } from 'twenty-sdk/define';

import { planUniqueName } from 'src/fieldservice/utils/plan-unique-name.util';
import { isApplicationWrite } from 'src/shared/triggers/actor';
import { updatedFieldsOf } from 'src/shared/triggers/event-values';
import { putBack } from 'src/shared/triggers/put-back';
import { type Records } from 'src/shared/triggers/records';
import { errorCollector } from 'src/shared/triggers/retry-on-conflict';
import { localizedReason } from 'src/stock/stock-event-helpers';

type NamedRecord = { name?: string | null; updatedBy?: { source?: string | null } | null };

const nameOf = (value: unknown) => (typeof value === 'string' && value !== '' ? value : null);

// A staff save that gives a row a name another live row of the same table holds is undone with a note: a new
// row loses the name, a renamed one gets its old name back. Trashed rows do not count.
export const refuseDuplicateNames = async ({
  records,
  operation,
  events,
  reason,
}: {
  records: Records;
  operation: 'created' | 'updated';
  events: ObjectRecordEvent<NamedRecord>[];
  reason: string;
}) => {
  const saves = events.filter((event) => {
    const after = 'after' in event.properties ? event.properties.after : undefined;

    return !isApplicationWrite(after) && (operation === 'created' || updatedFieldsOf(event).includes('name'));
  });

  if (saves.length === 0) {
    return;
  }
  const rows = await records.find<{ id: string; name: string | null }>({}, 'id name');
  const errors = errorCollector();

  for (const recordId of [...new Set(saves.map((event) => event.recordId))]) {
    const current = rows.find((row) => row.id === recordId);
    const first = saves.find((event) => event.recordId === recordId);

    if (current === undefined || first === undefined) {
      continue;
    }
    const before = 'before' in first.properties ? first.properties.before : undefined;
    const plan = planUniqueName({
      name: nameOf(current.name),
      beforeName: nameOf(before?.name),
      isCreate: operation === 'created',
      otherNames: rows.filter((row) => row.id !== recordId).map((row) => nameOf(row.name)),
    });

    if (plan.kind === 'putBack') {
      await errors.run(recordId, async () =>
        putBack({
          objectSingular: records.objectSingular,
          objectPlural: records.objectPlural,
          recordId,
          data: { name: plan.name },
          reason: await localizedReason(first, reason),
        }),
      );
    }
  }
  errors.throwIfAny();
};
