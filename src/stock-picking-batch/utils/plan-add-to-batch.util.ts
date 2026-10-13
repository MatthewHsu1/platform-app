import { BATCH_STATE, DEFAULT_BATCH_NAME } from 'src/stock-picking-batch/stock-picking-batch-options.constant';
import { type BatchState } from 'src/stock-picking-batch/types/batch-state.type';
import { type PickingForCheck } from 'src/stock-picking-batch/types/picking-for-check.type';
import { incompatiblePickings } from 'src/stock-picking-batch/utils/allowed-pickings.util';

type ChosenBatch = { id: string; name: string; state: BatchState; pickingTypeId: string | null; isWave: boolean };

const OPEN_BATCH_STATES = new Set<string>([BATCH_STATE.DRAFT, BATCH_STATE.IN_PROGRESS]);

const refuseIncompatible = (batchName: string, transfers: string[]) => ({
  kind: 'refuse' as const,
  message: 'incompatible' as const,
  batchName,
  transfers,
});

// Puts the selected transfers in a new batch or in an open batch transfer.
// A batch with no operation type takes the first transfer's, so the
// transfers are checked against that type; a new batch is a draft while they
// join it.
export const planAddToBatch = ({
  mode,
  batch,
  pickings,
  responsibleId,
  description,
  isCreateDraft,
}: {
  mode: 'NEW' | 'EXISTING';
  batch: ChosenBatch | null;
  pickings: PickingForCheck[];
  responsibleId: string | null;
  description: string | null;
  isCreateDraft: boolean;
}) => {
  const firstTypeId = pickings[0]?.pickingTypeId ?? null;

  if (mode === 'EXISTING') {
    if (batch === null || batch.isWave || !OPEN_BATCH_STATES.has(batch.state)) {
      return { kind: 'refuse' as const, message: 'chooseBatch' as const };
    }
    const refused = incompatiblePickings(
      { name: batch.name, state: batch.state, pickingTypeId: batch.pickingTypeId ?? firstTypeId },
      pickings,
    );

    return refused.length > 0 ? refuseIncompatible(batch.name, refused) : { kind: 'join' as const, batchId: batch.id };
  }
  // A refused new batch is never made, so it has no number to show.
  const refused = incompatiblePickings({ name: DEFAULT_BATCH_NAME, state: BATCH_STATE.DRAFT, pickingTypeId: firstTypeId }, pickings);

  if (refused.length > 0) {
    return refuseIncompatible(DEFAULT_BATCH_NAME, refused);
  }
  return {
    kind: 'create' as const,
    values: { pickingTypeId: firstTypeId, responsibleId, description, isWave: false as const },
    confirm: !isCreateDraft,
  };
};
