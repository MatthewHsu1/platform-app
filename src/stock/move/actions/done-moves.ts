import { prefixedJournal } from 'src/shared/claims/prefixed-journal';
import { derivedId } from 'src/shared/utils/derived-id.util';
import { graphqlDoneMovesStore } from 'src/stock/move/actions/done-moves-store';
import { makeSplitMoves } from 'src/stock/move/actions/split-moves';
import { destinationKeyOf, parseQuantKey, quantKey, sourceKeyOf } from 'src/stock/quant/quant-key';
import { MOVE_STATE, PICKING_TYPE_CODE } from 'src/stock/stock-options.constant';
import { planActionDone } from 'src/stock/utils/plan-action-done.util';
import { planLotCompensation } from 'src/stock/utils/plan-lot-compensation.util';
import { isZeroAtDigits } from 'src/stock/utils/stock-uom.util';
import { type ClaimJournal } from 'src/shared/claims/types/claim-journal.type';
import { type DoneLineData } from 'src/stock/move/types/done-line-data.type';
import { type DoneMoveData } from 'src/stock/move/types/done-move-data.type';
import { type DoneMovesOptions } from 'src/stock/move/types/done-moves-options.type';
import { type DoneMovesResult } from 'src/stock/move/types/done-moves-result.type';
import { type DoneMovesStore } from 'src/stock/move/types/done-moves-store.type';
import { type FreeReservationPlan } from 'src/stock/utils/types/free-reservation-plan.type';

// Ids only: the claim row rewrites its whole journal on every save.
type DonePlan = {
  cancelMoveIds: string[];
  destroyLineIds: string[];
  todoMoveIds: string[];
  splitMoveIds: string[];
  lines: { id: string; moveId: string }[];
  productIds: string[];
  pickingIds: string[];
  retryWaiting: boolean;
};

type Side = 'source' | 'destination';

// One journal save per chunk of lines committed.
const CHUNK_SIZE = 25;
const NOTHING_TO_FREE: FreeReservationPlan = { destroy: [], shrink: [], movesToReassign: [] };

// A line whose lot was set at validation (made from its typed name) was reserved on the row without a lot,
// so that row is recomputed with the lot's row.
const reservedKeysOf = (line: DoneLineData) => {
  const sourceKey = sourceKeyOf(line);

  return line.lotId === null ? [sourceKey] : [sourceKey, sourceKeyOf({ ...line, lotId: null })];
};

export const makeDoneMoves = (store: DoneMovesStore) => {
  const splitMoves = makeSplitMoves(store);

  // A lot the line took below zero, at its source or still at its destination, takes what it lacks from the stock
  // without a lot at the same place. The row is the ledger entry of that transfer; its id comes from the line and the
  // key and side, so a rerun finds it instead of making a second one, and a line whose source and destination are
  // the same row still gets one entry for each side.
  const compensationIdOf = (line: DoneLineData, side: Side, key: string) =>
    derivedId('lotCompensation', line.id, side, key);

  // A rerun settles the stored compensations before the line's own keys, the order the clean run posted them in.
  // Returns what each stored row moved, by key.
  const settleCompensations = async (line: DoneLineData, sides: { side: Side; key: string }[]) => {
    const settled = new Map<Side, number>();

    if (line.lotId === null) {
      return settled;
    }
    for (const { side, key } of sides) {
      const stored = await store.readLotCompensation(compensationIdOf(line, side, key));

      if (stored !== null) {
        const removed = await store.settleQuantDelta({ key: stored.noLotKey, delta: -stored.quantity, inDate: null });
        await store.settleQuantDelta({ key: stored.lotKey, delta: stored.quantity, inDate: removed.inDate });
        settled.set(side, stored.quantity);
      }
    }
    return settled;
  };

  // Returns what it moved into the lot.
  const compensateLot = async (line: DoneLineData, side: Side, key: string) => {
    if (line.lotId === null) {
      return 0;
    }
    const plan = planLotCompensation({
      key,
      lotAvailable: await store.readAvailable(key),
      noLotFree: await store.readAvailable(quantKey({ ...parseQuantKey(key), lotId: null })),
      quantity: line.quantityProductUom,
      digits: store.digits(),
    });

    if (plan === null) {
      return 0;
    }
    await store.createLotCompensation({
      id: compensationIdOf(line, side, key),
      moveLineId: line.id,
      lotKey: key,
      noLotKey: plan.noLotKey,
      quantity: plan.quantity,
      date: store.now(),
    });
    const removed = await store.applyQuantDelta({ key: plan.noLotKey, delta: -plan.quantity, inDate: null });
    await store.applyQuantDelta({ key, delta: plan.quantity, inDate: removed.inDate });
    return plan.quantity;
  };

  // The commit point is per line: a line in state DONE is in the ledger, then its two deltas follow.
  // Lines are written one after another, so in a chunk that was running when the server stopped
  // every DONE line but the last finished all its writes. That last one may miss a delta: its two
  // keys are checked against the ledger (the done lines are the truth) and only what is missing is posted. Its stock
  // release (freeing what other moves reserved) is a step of its own, so a stop in the middle of it
  // replays the rest of the stored release.
  const postChunk = async (chunk: DonePlan['lines'], journal: ClaimJournal, step: (name: string) => string, allLineIds: string[]) => {
    const digits = store.digits();
    const moves = await store.readMoves([...new Set(chunk.map((line) => line.moveId))]);
    const found = new Map<string, { line: DoneMoveData['lines'][number]; move: DoneMoveData }>(
      moves.flatMap((move) => move.lines.map((line) => [line.id, { line, move }] as const)),
    );
    const lastDone = chunk.reduce(
      (last, planned, index) => (found.get(planned.id)?.line.state === MOVE_STATE.DONE ? index : last),
      -1,
    );

    for (const [index, planned] of chunk.entries()) {
      const entry = found.get(planned.id);

      // Gone since the plan: there is nothing to post.
      if (entry === undefined) {
        continue;
      }
      const { line, move } = entry;
      const wasDone = line.state === MOVE_STATE.DONE;

      if (wasDone && index < lastDone) {
        continue;
      }
      const sourceKey = sourceKeyOf(line);
      const destinationKey = destinationKeyOf(line);

      if (!wasDone) {
        await store.commitLine(line.id, store.now());
      }
      if (!move.isStorable) {
        continue;
      }
      const settled = wasDone
        ? await settleCompensations(line, [
            { side: 'source', key: sourceKey },
            { side: 'destination', key: destinationKey },
          ])
        : new Map<Side, number>();
      const post = (args: { key: string; delta: number; inDate: string | null }) =>
        wasDone ? store.settleQuantDelta(args) : store.applyQuantDelta(args);
      const removed = await post({ key: sourceKey, delta: -line.quantityProductUom, inDate: null });
      await post({ key: destinationKey, delta: line.quantityProductUom, inDate: removed.inDate });
      await store.recomputeReserved(reservedKeysOf(line));
      const sourceCompensation = settled.get('source') ?? (await compensateLot(line, 'source', sourceKey));

      if (!settled.has('destination')) {
        await compensateLot(line, 'destination', destinationKey);
      }
      // Reservations are freed by the shortfall the line left at its source before the lot was made up.
      const available = (await store.readAvailable(sourceKey)) - sourceCompensation;
      const release =
        available < 0 && !isZeroAtDigits(available, digits)
          ? await store.planReservationRelease({ key: sourceKey, shortfall: -available, pickingId: move.pickingId, ignoreLineIds: allLineIds })
          : NOTHING_TO_FREE;

      // A rerun of the last line looks for a release the stopped run had stored.
      if (wasDone || release.destroy.length > 0 || release.shrink.length > 0) {
        await journal.step(
          step(`line:${line.id}:free`),
          async () => release,
          (stored) => store.releaseReservation(sourceKey, stored),
        );
      }
    }
  };

  // The committed lines of storable moves as they are now: a lot set at validation is on them.
  const readCommittedStockLines = async (moveIds: string[], committedLineIds: string[]) => {
    if (moveIds.length === 0) {
      return [];
    }
    const committed = new Set(committedLineIds);

    return (await store.readMoves(moveIds))
      .filter((move) => move.isStorable)
      .flatMap((move) => move.lines.filter((line) => committed.has(line.id)));
  };

  const recomputeTracking = async (moveIds: string[], committedLineIds: string[]) => {
    const keys = (await readCommittedStockLines(moveIds, committedLineIds)).flatMap((line) => [sourceKeyOf(line), destinationKeyOf(line)]);

    if (keys.length > 0) {
      await store.recomputeTrackingForKeys([...new Set(keys)]);
    }
  };

  return async (moveIds: string[], options: DoneMovesOptions): Promise<DoneMovesResult> => {
    const { journal } = options;
    const step = (name: string) => `${options.stepPrefix}:${name}`;

    await journal.step(
      step('confirm'),
      async () => (await store.readMoves(moveIds)).filter((move) => move.state === MOVE_STATE.DRAFT).map((move) => move.id),
      async (draftIds) => {
        if (draftIds.length > 0) {
          await store.confirmMoves(draftIds, {
            merge: false,
            createProcurement: true,
            journal: prefixedJournal(journal, step('confirm')),
          });
        }
      },
    );

    const plan = await journal.step<DonePlan>(
      step('plan'),
      async () => {
        const moves = await store.readMoves(moveIds);
        const action = planActionDone({
          moves: moves.map((move) => ({
            id: move.id,
            state: move.state,
            picked: move.picked,
            productUomQty: move.productUomQty,
            isInventory: move.isInventory,
            productUomId: move.productUomId,
            lines: move.lines.map((line) => ({ id: line.id, quantity: line.quantity, productUomId: line.productUomId, picked: line.picked })),
          })),
          cancelBackorder: options.cancelBackorder,
          uoms: await store.uoms(),
          digits: store.digits(),
        });
        const todo = moves.filter((move) => action.todoMoveIds.includes(move.id));
        const commit = new Set(action.commitLineIds);

        return {
          cancelMoveIds: action.cancelMoveIds,
          destroyLineIds: action.destroyLineIds,
          todoMoveIds: action.todoMoveIds,
          splitMoveIds: action.splitMoveIds,
          lines: todo.flatMap((move) => move.lines.filter((line) => commit.has(line.id)).map((line) => ({ id: line.id, moveId: move.id }))),
          productIds: [...new Set(todo.map((move) => move.productId))],
          pickingIds: [...new Set(moves.flatMap((move) => (move.pickingId === null ? [] : [move.pickingId])))],
          retryWaiting:
            options.retryWaiting ??
            todo.some(
              (move) => move.pickingTypeCode === PICKING_TYPE_CODE.INCOMING || move.pickingTypeCode === PICKING_TYPE_CODE.INTERNAL,
            ),
        };
      },
      async () => {},
    );

    await journal.step(
      step('cancel'),
      async () => true,
      async () => {
        if (plan.cancelMoveIds.length > 0) {
          await store.cancelMoves(plan.cancelMoveIds);
        }
        if (plan.destroyLineIds.length > 0) {
          await store.destroyLines(plan.destroyLineIds);
        }
      },
    );

    const backorderMoveIds = await splitMoves(plan.splitMoveIds, journal, step('split'));
    const lineIds = plan.lines.map((line) => line.id);

    await journal.step(
      step('tracking'),
      async () => true,
      async () => {
        if (lineIds.length > 0) {
          await store.applyTrackingOnDone(lineIds, { skipPackageHistory: options.skipPackageHistory === true });
        }
      },
    );

    for (let start = 0; start < plan.lines.length; start += CHUNK_SIZE) {
      await journal.step(
        step(`lines:${start / CHUNK_SIZE}`),
        async () => true,
        () => postChunk(plan.lines.slice(start, start + CHUNK_SIZE), journal, step, lineIds),
      );
    }

    // Planned after the stock moved and stored, so a rerun applies the same container moves.
    await journal.step(
      step('packages'),
      () =>
        store.planPackagesAfterDone(lineIds, {
          skipContainers: options.skipPackageHistory === true,
          siblingPickingIds: options.siblingPickingIds ?? [],
        }),
      (packagePlan) => store.applyPackagesAfterDone(packagePlan),
    );

    await journal.step(
      step('moves'),
      async () => options.moveDate ?? store.now(),
      async (date) => {
        if (plan.todoMoveIds.length > 0) {
          await store.updateMoves(plan.todoMoveIds.map((id) => ({ id, data: { state: MOVE_STATE.DONE, date } })));
        }
      },
    );

    await journal.step(
      step('recompute'),
      async () => true,
      async () => {
        if (plan.todoMoveIds.length > 0) {
          await store.recomputeMove(plan.todoMoveIds);
        }
        if (plan.pickingIds.length > 0) {
          await store.recomputePickingState(plan.pickingIds);
        }
        if (plan.productIds.length > 0) {
          await store.recomputeProductQuantities(plan.productIds);
        }
        await recomputeTracking(plan.todoMoveIds, lineIds);
      },
    );

    await journal.step(
      step('push'),
      async () => true,
      async () => {
        if (plan.todoMoveIds.length === 0) {
          return;
        }
        // Its own steps go under this run's prefix, so a rerun replays the pushes it stored.
        await store.pushApply(plan.todoMoveIds, { journal: prefixedJournal(journal, options.stepPrefix) });
        const destinationIds = await store.readOpenDestinationMoveIds(plan.todoMoveIds);

        if (destinationIds.length > 0) {
          await store.assignMoves(destinationIds);
        }
      },
    );

    await journal.step(
      step('retry'),
      async () => plan.retryWaiting,
      async (retry) => {
        if (retry && plan.todoMoveIds.length > 0) {
          await store.retryWaitingMoves(plan.todoMoveIds);
        }
      },
    );

    const doneLines = await readCommittedStockLines(plan.todoMoveIds, lineIds);

    return {
      doneMoveIds: plan.todoMoveIds,
      backorderMoveIds,
      touchedSourceKeys: [...new Set(doneLines.flatMap((line) => reservedKeysOf(line)))],
    };
  };
};

export const doneMoves = makeDoneMoves(graphqlDoneMovesStore);
