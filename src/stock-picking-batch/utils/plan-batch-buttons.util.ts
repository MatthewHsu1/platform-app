import { BATCH_STATE } from 'src/stock-picking-batch/stock-picking-batch-options.constant';
import { type BatchForCheck } from 'src/stock-picking-batch/types/batch-for-check.type';
import { type BatchState } from 'src/stock-picking-batch/types/batch-state.type';
import { type MergeBatch } from 'src/stock-picking-batch/types/merge-batch.type';
import { type PickingForCheck } from 'src/stock-picking-batch/types/picking-for-check.type';
import { incompatiblePickings } from 'src/stock-picking-batch/utils/allowed-pickings.util';
import { MOVE_STATE } from 'src/stock/stock-options.constant';

export const planBatchConfirm = ({ state, pickingCount }: { state: BatchState; pickingCount: number }) =>
  state !== BATCH_STATE.DRAFT ? ('notDraft' as const) : pickingCount === 0 ? ('noPickings' as const) : null;

const READY_OR_CLOSED = new Set<string>([MOVE_STATE.ASSIGNED, MOVE_STATE.DONE, MOVE_STATE.CANCEL]);

export const planBatchCheckAvailability = ({ state, moveStates }: { state: BatchState; moveStates: string[] }) =>
  (state === BATCH_STATE.DRAFT || state === BATCH_STATE.IN_PROGRESS) && moveStates.some((moveState) => !READY_OR_CLOSED.has(moveState))
    ? null
    : ('nothingToCheck' as const);

export const planBatchCancel = ({ state }: { state: BatchState }) => (state === BATCH_STATE.IN_PROGRESS ? null : ('notInProgress' as const));

const refuse = (message: 'mergeFew' | 'mergeTypes' | 'mergeKinds' | 'mergeStates' | 'mergeClosed') => ({ kind: 'refuse' as const, message });

// The batches in the order they were selected: the first one is kept and gets
// the transfers of the others. A batch without an operation type fits any type.
export const planBatchMerge = (batches: MergeBatch[]) => {
  if (batches.length < 2) {
    return refuse('mergeFew');
  }
  if (new Set(batches.flatMap((batch) => batch.pickingTypeId ?? [])).size > 1) {
    return refuse('mergeTypes');
  }
  if (new Set(batches.map((batch) => batch.isWave)).size > 1) {
    return refuse('mergeKinds');
  }
  if (new Set(batches.map((batch) => batch.state)).size > 1) {
    return refuse('mergeStates');
  }
  if (batches[0].state === BATCH_STATE.DONE || batches[0].state === BATCH_STATE.CANCEL) {
    return refuse('mergeClosed');
  }
  const earliest =
    batches
      .filter((batch) => batch.scheduledDate !== null)
      .sort((left, right) => (left.scheduledDate ?? '').localeCompare(right.scheduledDate ?? ''))[0] ?? batches[0];

  return {
    kind: 'merge' as const,
    targetId: batches[0].id,
    otherIds: batches.slice(1).map((batch) => batch.id),
    values: { responsibleId: earliest.responsibleId, description: earliest.description, scheduledDate: earliest.scheduledDate },
  };
};

// The kept batch must be allowed to hold every transfer it ends up with. One
// without a type takes the type of the first transfer it gets.
export const mergeIncompatibilities = ({
  target,
  own,
  moved,
}: {
  target: BatchForCheck;
  own: PickingForCheck[];
  moved: PickingForCheck[];
}) => {
  const pickingTypeId = target.pickingTypeId ?? moved[0]?.pickingTypeId ?? null;

  return incompatiblePickings({ ...target, pickingTypeId }, [...own, ...moved]);
};
