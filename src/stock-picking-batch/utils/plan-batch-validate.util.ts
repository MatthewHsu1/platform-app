import { type BatchValidatePicking } from 'src/stock-picking-batch/types/batch-validate-picking.type';
import { MOVE_STATE, PICKING_STATE } from 'src/stock/stock-options.constant';
import { isZeroAtDigits } from 'src/stock/utils/stock-uom.util';

const liveMoves = (picking: BatchValidatePicking) =>
  picking.moves.filter((move) => move.state !== MOVE_STATE.DONE && move.state !== MOVE_STATE.CANCEL);

// Batch Validate sorts the batch's open transfers. Waiting ones with nothing
// picked and ready ones with nothing reserved leave the batch unvalidated.
// When some of the rest have picked quantities, the ones with none leave as
// well; when none has, they are all validated. Before that sorting, a transfer
// of the rest with nothing to move at all (a draft with no moves) refuses the
// whole click: `withoutMoves` names them, and `listed` says whether the
// refusal lists them, which it does when several transfers are in play and
// they are not all the batch's transfers.
export const planBatchValidate = ({ pickings, digits }: { pickings: BatchValidatePicking[]; digits: number }) => {
  const hasNoQuantity = (picking: BatchValidatePicking) =>
    liveMoves(picking).every((move) => !move.picked || isZeroAtDigits(move.quantity, digits));
  const isEmpty = (picking: BatchValidatePicking) => liveMoves(picking).every((move) => isZeroAtDigits(move.quantity, digits));
  const emptyWaitingIds = pickings
    .filter(
      (picking) =>
        ((picking.state === PICKING_STATE.WAITING || picking.state === PICKING_STATE.CONFIRMED) && hasNoQuantity(picking)) ||
        (picking.state === PICKING_STATE.ASSIGNED && isEmpty(picking)),
    )
    .map((picking) => picking.id);
  const open = pickings.filter(
    (picking) => picking.state !== PICKING_STATE.DONE && picking.state !== PICKING_STATE.CANCEL && !emptyWaitingIds.includes(picking.id),
  );
  const noQuantityIds = open.filter(hasNoQuantity).map((picking) => picking.id);
  const someHaveQuantities = noQuantityIds.length !== open.length;
  const withoutMovesIds = open.filter((picking) => picking.moves.length === 0 && picking.lineCount === 0).map((picking) => picking.id);

  return {
    withoutMoves: withoutMovesIds.length === 0 ? null : { ids: withoutMovesIds, listed: open.length > 1 && open.length !== pickings.length },
    toValidateIds: open.filter((picking) => !someHaveQuantities || !noQuantityIds.includes(picking.id)).map((picking) => picking.id),
    pickingsToDetach: someHaveQuantities ? [...emptyWaitingIds, ...noQuantityIds] : emptyWaitingIds,
    emptyWaitingIds,
  };
};

// After any Validate, batch or not. Nothing happens when no transfer ended
// done: Validate stopped on a question. Otherwise the detached transfers
// leave the batch being validated; one that has since joined another batch
// stays there, so a rerun undoes nothing. A done transfer leaves a batch that
// still has transfers not done, so one batch never mixes finished and open
// work. Detached transfers and new backorders look for a batch again.
export const planAfterValidateBatch = ({
  validated,
  detached,
  batchesToValidate,
  batchMemberStates,
}: {
  validated: { id: string; state: string; batchId: string | null; backorderIds: string[] }[];
  detached: { id: string; batchId: string | null }[];
  batchesToValidate: string[];
  batchMemberStates: ReadonlyMap<string, { id: string; state: string }[]>;
}) => {
  const done = validated.filter((picking) => picking.state === PICKING_STATE.DONE);

  if (done.length === 0) {
    return { stop: true, detachIds: [], unpickIds: [], leaveIds: [], rebatchIds: [] };
  }
  const detachedIds = new Set(detached.map((picking) => picking.id));
  const freedIds = detached
    .filter((picking) => picking.batchId === null || batchesToValidate.includes(picking.batchId))
    .map((picking) => picking.id);
  const leaveIds = done
    .filter(
      (picking) =>
        picking.batchId !== null &&
        (batchMemberStates.get(picking.batchId) ?? []).some((member) => !detachedIds.has(member.id) && member.state !== PICKING_STATE.DONE),
    )
    .map((picking) => picking.id);

  return {
    stop: false,
    detachIds: detached
      .filter((picking) => picking.batchId !== null && batchesToValidate.includes(picking.batchId))
      .map((picking) => picking.id),
    unpickIds: freedIds,
    leaveIds,
    rebatchIds: [...new Set([...freedIds, ...done.flatMap((picking) => picking.backorderIds)])],
  };
};

// Before a backorder is made: a transfer not done leaves a batch that holds
// transfers outside this validation (detached ones aside), so the batch does
// not end up with a done transfer next to open ones.
export const pickingsLeavingBeforeBackorder = ({
  pickings,
  validatingIds,
  pickingsToDetach,
  batchMembers,
}: {
  pickings: { id: string; state: string; batchId: string | null }[];
  validatingIds: string[];
  pickingsToDetach: string[];
  batchMembers: ReadonlyMap<string, string[]>;
}) => {
  const inside = new Set([...validatingIds, ...pickingsToDetach]);

  return pickings
    .filter(
      (picking) =>
        picking.batchId !== null &&
        picking.state !== PICKING_STATE.DONE &&
        (batchMembers.get(picking.batchId) ?? []).some((memberId) => !inside.has(memberId)),
    )
    .map((picking) => picking.id);
};
