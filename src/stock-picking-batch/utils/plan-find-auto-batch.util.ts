import { BATCH_STATE } from 'src/stock-picking-batch/stock-picking-batch-options.constant';
import { type AutoBatchPicking } from 'src/stock-picking-batch/types/auto-batch-picking.type';
import { type AutoBatchType } from 'src/stock-picking-batch/types/auto-batch-type.type';
import { type BatchState } from 'src/stock-picking-batch/types/batch-state.type';
import { type GroupValues } from 'src/stock-picking-batch/types/group-values.type';
import { type OpenBatch } from 'src/stock-picking-batch/types/open-batch.type';
import { PICKING_STATE, PRIORITY } from 'src/stock/stock-options.constant';

type GroupKey = 'partnerKey' | 'countryKey' | 'locationId' | 'locationDestId';

const groupKeys = (type: AutoBatchType): GroupKey[] => [
  ...(type.batchGroupByPartner ? (['partnerKey'] as const) : []),
  ...(type.batchGroupByDestination ? (['countryKey'] as const) : []),
  ...(type.batchGroupBySrcLoc ? (['locationId'] as const) : []),
  ...(type.batchGroupByDestLoc ? (['locationDestId'] as const) : []),
];

export const autoBatchDescription = (type: AutoBatchType, values: GroupValues) =>
  [
    type.batchGroupByPartner && values.partnerKey !== null ? (values.partnerName ?? '') : null,
    type.batchGroupByDestination && values.countryKey !== null ? values.countryName : null,
    type.batchGroupBySrcLoc && values.locationId !== null ? values.locationName : null,
    type.batchGroupByDestLoc && values.locationDestId !== null ? values.locationDestName : null,
  ]
    .filter((part): part is string => part !== null)
    .join(', ');

// A transfer can go into a batch when it is ready, its moves (with the other
// transfer's, when it pairs) stay within max lines, and max transfers is not 1:
// a batch of one transfer at most is no batch.
const isBatchable = (type: AutoBatchType, picking: AutoBatchPicking, other?: AutoBatchPicking) =>
  picking.state === PICKING_STATE.ASSIGNED &&
  (type.batchMaxLines === 0 || picking.moveCount + (other?.moveCount ?? 0) <= type.batchMaxLines) &&
  (type.batchMaxPickings === 0 || type.batchMaxPickings > 1);

const fitsBatch = (type: AutoBatchType, batch: OpenBatch, picking: AutoBatchPicking) =>
  (type.batchMaxLines === 0 || batch.moveCount + picking.moveCount <= type.batchMaxLines) &&
  (type.batchMaxPickings === 0 || batch.pickings.length + 1 <= type.batchMaxPickings);

const urgency = (picking: AutoBatchPicking) => (picking.priority === PRIORITY.URGENT ? 1 : 0);

// Transfer order: urgent first, then the earliest scheduled date (a transfer
// with no date last), then the newest.
const pickingOrder = (left: AutoBatchPicking, right: AutoBatchPicking) =>
  urgency(right) - urgency(left) ||
  (left.scheduledDate === right.scheduledDate
    ? 0
    : left.scheduledDate === null
      ? 1
      : right.scheduledDate === null
        ? -1
        : left.scheduledDate.localeCompare(right.scheduledDate)) ||
  right.createdAt.localeCompare(left.createdAt);

// A batch matches when, for each group value, one of its transfers has it; a
// transfer to pair with must have them all.
export const planFindAutoBatch = ({
  picking,
  type,
  openBatches,
  otherPickings,
  batchesToValidate,
}: {
  picking: AutoBatchPicking;
  type: AutoBatchType;
  openBatches: OpenBatch[];
  otherPickings: AutoBatchPicking[];
  batchesToValidate: string[];
}):
  | { kind: 'skip' }
  | { kind: 'join'; batchId: string }
  | { kind: 'create'; pickingIds: string[]; description: string; responsibleId: string | null; confirm: boolean } => {
  const keys = groupKeys(type);

  if (!type.autoBatch || keys.length === 0 || picking.batchId !== null || picking.moveCount === 0 || !isBatchable(type, picking)) {
    return { kind: 'skip' };
  }
  const openStates: BatchState[] = type.batchAutoConfirm ? [BATCH_STATE.DRAFT, BATCH_STATE.IN_PROGRESS] : [BATCH_STATE.DRAFT];
  const batch = [...openBatches]
    .sort((left, right) => right.name.localeCompare(left.name))
    .find(
      (candidate) =>
        openStates.includes(candidate.state) &&
        candidate.pickingTypeId === picking.pickingTypeId &&
        !candidate.isWave &&
        !batchesToValidate.includes(candidate.id) &&
        keys.every((key) => candidate.pickings.some((member) => member[key] === picking[key])) &&
        fitsBatch(type, candidate, picking),
    );

  if (batch !== undefined) {
    return { kind: 'join', batchId: batch.id };
  }
  const description = autoBatchDescription(type, picking);
  const pair = [...otherPickings]
    .sort(pickingOrder)
    .find(
      (other) =>
        other.id !== picking.id &&
        other.state === PICKING_STATE.ASSIGNED &&
        other.pickingTypeId === picking.pickingTypeId &&
        other.batchId === null &&
        keys.every((key) => other[key] === picking[key]) &&
        isBatchable(type, picking, other),
    );

  if (pair !== undefined) {
    return { kind: 'create', pickingIds: [picking.id, pair.id], description, responsibleId: null, confirm: type.batchAutoConfirm };
  }
  return {
    kind: 'create',
    pickingIds: [picking.id],
    description,
    responsibleId: picking.responsibleUserId,
    confirm: type.batchAutoConfirm,
  };
};
