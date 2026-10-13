import { type ObjectRecordEvent } from 'twenty-sdk/define';

import { planTreeSave } from 'src/helpdesk/utils/plan-tree-save.util';
import { isStaffChange } from 'src/shared/triggers/actor';
import { putBack } from 'src/shared/triggers/put-back';
import { type RecordOperation } from 'src/shared/triggers/batch-events';
import { type Records } from 'src/shared/triggers/records';
import { errorCollector } from 'src/shared/triggers/retry-on-conflict';
import { eventAfter, eventBefore, localizedReason } from 'src/stock/stock-event-helpers';

type TreeRecord = {
  id: string;
  name: string | null;
  parentId: string | null;
  completeName: string | null;
  updatedBy?: { source?: string | null } | null;
};

// Keeps the full names of a tree (teams or categories) right after a save, and puts back a parent
// that would make a record its own ancestor.
export const runTreePass = async ({
  rows,
  operation,
  events,
  refusal,
}: {
  rows: Records;
  operation: RecordOperation;
  events: ObjectRecordEvent<TreeRecord>[];
  refusal: string;
}) => {
  const everyRow = await rows.find<TreeRecord>({}, 'id name parentId completeName');
  const plan = planTreeSave({
    rows: everyRow,
    saves: events.map((event) => ({
      id: event.recordId,
      staff: isStaffChange(operation, event, eventAfter(event)),
      beforeParentId: eventBefore(event)?.parentId ?? null,
    })),
  });
  const errors = errorCollector();

  for (const undo of plan.putBacks) {
    const event = events.find((candidate) => candidate.recordId === undo.id);

    await errors.run(undo.id, async () =>
      putBack({
        objectSingular: rows.objectSingular,
        objectPlural: rows.objectPlural,
        recordId: undo.id,
        data: { parentId: undo.parentId },
        reason: await localizedReason(event ?? {}, refusal),
      }),
    );
  }
  for (const name of plan.names) {
    await errors.run(name.id, () => rows.update(name.id, { completeName: name.completeName }));
  }
  errors.throwIfAny();
};
