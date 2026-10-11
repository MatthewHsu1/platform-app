import { type ObjectRecordEvent } from 'twenty-sdk/define';

import { createMissingRows } from 'src/shared/claims/create-missing-rows';
import { type RecordOperation } from 'src/shared/triggers/batch-events';
import { errorCollector } from 'src/shared/triggers/retry-on-conflict';
import { derivedId } from 'src/shared/utils/derived-id.util';
import { stockPackageTypes } from 'src/stock/routing-records';
import { eventAfter, eventBefore } from 'src/stock/stock-event-helpers';
import { irSequences } from 'src/stock/stock-records';
import { planPackageTypeSequence } from 'src/stock/utils/plan-package-tree.util';

type PackageTypeSequenceRecord = { id: string; sequenceCode?: string | null; updatedAt?: string };

type StoredPackageType = { id: string; sequenceCode: string | null; referenceSequenceId: string | null };

// A package type's sequence prefix makes, or renames, its own package
// numbering sequence. The app's write of the new sequence link comes back
// here with the code unchanged and plans nothing.
export const settlePackageTypeSequences = async (
  operation: RecordOperation,
  events: ObjectRecordEvent<PackageTypeSequenceRecord>[],
) => {
  if (operation !== 'created' && operation !== 'updated') {
    return;
  }
  const changes = new Map<string, { beforeCode: string | null; updatedAt: string | undefined }>();

  for (const event of events) {
    const known = changes.get(event.recordId);
    const codeChanged = (eventBefore(event)?.sequenceCode ?? null) !== (eventAfter(event)?.sequenceCode ?? null);

    if (operation === 'updated' && known === undefined && !codeChanged) {
      continue;
    }

    changes.set(event.recordId, {
      beforeCode: known === undefined ? (eventBefore(event)?.sequenceCode ?? null) : known.beforeCode,
      updatedAt: eventAfter(event)?.updatedAt,
    });
  }
  const stored = await stockPackageTypes.find<StoredPackageType>(
    { id: { in: [...changes.keys()] } },
    'id sequenceCode referenceSequenceId',
  );
  const liveSequenceIds = new Set(
    (
      await irSequences.find<{ id: string }>(
        { id: { in: stored.flatMap((row) => row.referenceSequenceId ?? []) } },
        'id',
      )
    ).map((row) => row.id),
  );
  const errors = errorCollector();

  for (const row of stored) {
    const change = changes.get(row.id);

    if (change === undefined) {
      continue;
    }
    await errors.run(row.id, async () => {
      // A deleted sequence numbers nothing: the type gets a new one.
      const referenceSequenceId =
        row.referenceSequenceId !== null && liveSequenceIds.has(row.referenceSequenceId) ? row.referenceSequenceId : null;
      const plan = planPackageTypeSequence({
        operation,
        beforeCode: change.beforeCode,
        sequenceCode: row.sequenceCode,
        referenceSequenceId,
      });

      if (plan.kind === 'create') {
        // The id comes from the save that typed the code, so a rerun of that
        // save finds the sequence it made instead of making another.
        if (change.updatedAt === undefined) {
          throw new Error(`The save event of package type ${row.id} carries no update time.`);
        }
        const sequenceId = derivedId('packageTypeSequence', row.id, plan.sequence.code, change.updatedAt);

        await createMissingRows(irSequences, [
          { id: sequenceId, data: { ...plan.sequence, numberNext: 1, numberIncrement: 1, active: true } },
        ]);
        await stockPackageTypes.update(row.id, { referenceSequenceId: sequenceId });
      } else if (plan.kind === 'update') {
        await irSequences.update(plan.sequenceId, plan.data);
      }
    });
  }
  errors.throwIfAny();
};
