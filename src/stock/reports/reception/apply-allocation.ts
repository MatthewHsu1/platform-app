import {
  CLAIM_HELD_MESSAGE,
  claimKey,
  heldClaimKeys,
  openJournal,
  releaseClaims,
  settleOwnedClaim,
  takeClaims,
  withClaim,
} from 'src/shared/claims/claim';
import { createMissingRows } from 'src/shared/claims/create-missing-rows';
import { type ClaimJournal } from 'src/shared/claims/types/claim-journal.type';
import { type TranslationValues } from 'src/shared/i18n/types/translation-values.type';
import { derivedId } from 'src/shared/utils/derived-id.util';
import { assignMoves } from 'src/stock/move/actions/assign-moves';
import { applyMoveSplit, planMoveSplit } from 'src/stock/move/actions/split-move';
import { unreserveMoves } from 'src/stock/move/actions/unreserve-moves';
import { linkMoves, readMoveReferences, unlinkMoves } from 'src/stock/move/move-links';
import { recomputeMove } from 'src/stock/move/recompute-move';
import { type MoveSplitPlan } from 'src/stock/move/types/move-split-plan.type';
import { recomputePickingState } from 'src/stock/picking/recompute-picking-state';
import { readStockProducts } from 'src/stock/product/read-stock-products';
import { sourceKeyOf } from 'src/stock/quant/quant-key';
import { recomputeReserved } from 'src/stock/quant/recompute-reserved';
import { readAllocationInputs, readMovePickingIds } from 'src/stock/reports/reception/read-reception-data';
import { RECEPTION_MESSAGES } from 'src/stock/reports/reception/reception-messages.constant';
import { type AllocationPort } from 'src/stock/reports/reception/types/allocation-port.type';
import { type AllocationRequest } from 'src/stock/reports/reception/types/allocation-request.type';
import { type AllocationRun } from 'src/stock/reports/reception/types/allocation-run.type';
import { StockUserError } from 'src/stock/stock-errors';
import { MOVE_STATE, PROCURE_METHOD } from 'src/stock/stock-options.constant';
import { stockMoveLines, stockMoves, stockReferenceMoveRels } from 'src/stock/stock-records';
import { MOVE_LINE_ROW } from 'src/stock/stock-rows';
import { readStockSettings } from 'src/stock/stock-settings';
import { readResolvedUoms } from 'src/stock/stock-uoms';
import { type MoveLineRow } from 'src/stock/types/move-line-row.type';
import { compareAtDigits } from 'src/stock/utils/stock-uom.util';
import { planAllocate, planAllocationLineWrites, planUnallocate } from 'src/stock/utils/plan-allocation.util';
import { type AllocationLineWrite } from 'src/stock/utils/types/allocation-line-write.type';

type Refusal = { kind: 'refuse'; message: string; values: TranslationValues };
type Held = { kind: 'held' };
type Planned = AllocationRun | Refusal;

const ALLOCATE_ACTION = 'allocate';
const PLAN_STEP = 'allocate:plan';
const HELD: Held = { kind: 'held' };
// Runs that change the same transfers and moves an allocation does; while one
// holds a transfer, the allocation waits.
const OTHER_FLOW_ACTIONS = ['validate', 'split', 'return'];

const distinct = (ids: string[]) => [...new Set(ids)];

const refuse = (message: string, values: TranslationValues = {}): Refusal => ({ kind: 'refuse', message, values });

const touchedLineIds = (writes: AllocationLineWrite[]) =>
  writes.flatMap((write) => (write.kind === 'move' ? [write.lineId] : [write.lineId, write.copyId]));

export const makeAllocation = (port: AllocationPort) => {
  // Every delivery and receipt the allocation touches is held, one claim per
  // transfer (or per move without one), in one fixed order.
  const keysOf = async (request: AllocationRequest) => {
    const moveIds = distinct(request.flatMap((entry) => [entry.moveId, ...entry.inIds]));
    const pickingOf = await port.readMovePickingIds(moveIds);

    return distinct(moveIds.map((id) => claimKey(ALLOCATE_ACTION, pickingOf.get(id) ?? id))).sort();
  };

  const otherFlowKeys = (keys: string[]) =>
    keys.flatMap((key) => {
      const recordId = key.slice(ALLOCATE_ACTION.length + 1);

      return OTHER_FLOW_ACTIONS.map((action) => claimKey(action, recordId));
    });

  // Reads only, once every transfer is held. Every id the run makes is chosen
  // here, so a rerun after a stop finds the rows it made.
  const planRun = async (
    kind: AllocationRun['kind'],
    request: AllocationRequest,
    runId: string,
    memberKeys: string[],
  ): Promise<Planned> => {
    const digits = port.digits();
    const { allocations, lines } = await port.readInputs(request);

    if (allocations.length !== request.length || allocations.some((allocation, index) => allocation.ins.length !== request[index].inIds.length)) {
      return refuse(RECEPTION_MESSAGES.notFound);
    }
    if (
      allocations.some(
        ({ out, quantity }) => compareAtDigits(quantity, 0, digits) <= 0 || compareAtDigits(quantity, out.productQty, digits) > 0,
      )
    ) {
      return refuse(RECEPTION_MESSAGES.quantity);
    }
    const uoms = await port.uoms();
    const newId = (rowId: string) => derivedId(ALLOCATE_ACTION, runId, rowId);

    if (kind === 'allocate') {
      const plan = planAllocate({ allocations, digits });
      const splits: MoveSplitPlan[] = [];

      for (const split of plan.splits) {
        const planned = await port.planMoveSplit(split.outId, split.remainderQty, { newMoveId: newId(split.outId) });

        // The remainder is waiting again, without being confirmed a second time.
        splits.push({
          ...planned,
          state: MOVE_STATE.CONFIRMED,
          newValues: { ...planned.newValues, reservationDate: split.reservationDate },
        });
      }
      const remainderOf = new Map(splits.map((split) => [split.moveId, split.newMoveId]));

      return {
        kind,
        memberKeys,
        claimRunId: runId,
        plan,
        splits,
        lineWrites: planAllocationLineWrites({
          splits: plan.lineSplits.map((lineSplit) => ({
            lineId: lineSplit.lineId,
            outMoveId: lineSplit.outId,
            outQuantity: lineSplit.outQuantity,
            otherMoveId: remainderOf.get(lineSplit.outId) ?? lineSplit.outId,
            otherQuantity: lineSplit.remainderQuantity,
          })),
          convertedSide: 'out',
          lines,
          uoms,
          digits,
          copyIdOf: newId,
        }),
      };
    }
    const [{ out, quantity, ins }] = allocations;

    if (out.state === MOVE_STATE.DONE) {
      return refuse(RECEPTION_MESSAGES.doneUnreserve);
    }
    const plan = planUnallocate({ out, quantity, ins, digits });
    let split: MoveSplitPlan | null = null;

    if (plan.split !== null) {
      const planned = await port.planMoveSplit(out.id, plan.split.newDemand, { newMoveId: newId(out.id) });
      const removedFromOut = new Set(
        plan.referencesToRemove.flatMap((entry) => (entry.pickingId === out.pickingId ? entry.referenceIds : [])),
      );

      // The new move keeps the incoming moves still linked and takes them
      // over, with the delivery's references as they are once the unlinked
      // transfer's ones are gone.
      split = {
        ...planned,
        state: MOVE_STATE.CONFIRMED,
        moveOrigIds: plan.split.originIds,
        referenceIds: planned.referenceIds.filter((id) => !removedFromOut.has(id)),
        newValues: { ...planned.newValues, procureMethod: PROCURE_METHOD.MAKE_TO_ORDER, reservationDate: plan.split.reservationDate },
      };
    }

    return {
      kind,
      memberKeys,
      claimRunId: runId,
      plan,
      split,
      lineWrites:
        plan.split === null || split === null
          ? []
          : planAllocationLineWrites({
              splits: plan.split.lineSplits.map((lineSplit) => ({
                lineId: lineSplit.lineId,
                outMoveId: out.id,
                outQuantity: lineSplit.outQuantity,
                otherMoveId: split.newMoveId,
                otherQuantity: lineSplit.newQuantity,
              })),
              convertedSide: 'other',
              lines,
              uoms,
              digits,
              copyIdOf: newId,
            }),
    };
  };

  // The writes after the commit point. Each step sets planned values only, so
  // a rerun of a step that stopped half-way finishes it.
  const finishRun = async (run: AllocationRun, journal: ClaimJournal) => {
    if (run.kind === 'allocate') {
      await journal.step(
        'allocate:apply',
        async () => null,
        async () => {
          for (const split of run.splits) {
            await port.applyMoveSplit(split);
          }
          await port.writeLines(run.lineWrites);
          await port.linkMoves(run.plan.links.map((link) => ({ moveOrigId: link.inId, moveDestId: link.outId })));
          await port.setProcureMethod(run.plan.makeToOrder, PROCURE_METHOD.MAKE_TO_ORDER);
          for (const { pickingId, referenceIds } of run.plan.references) {
            await port.addReferences(pickingId, referenceIds);
          }
          await port.recompute(
            [...run.plan.assignMoveIds, ...run.splits.map((split) => split.newMoveId)],
            touchedLineIds(run.lineWrites),
          );
        },
      );
      // Reserving right away keeps another move from taking goods that are
      // already in for this one.
      await journal.step(
        'allocate:reserve',
        async () => null,
        () => port.assignMoves(run.plan.assignMoveIds),
      );
      return;
    }
    const outId = run.plan.makeToStock;

    await journal.step(
      'unallocate:apply',
      async () => null,
      async () => {
        await port.unlinkMoves(run.plan.unlinks.map((unlink) => ({ moveOrigId: unlink.inId, moveDestId: unlink.outId })));
        for (const { pickingId, referenceIds } of run.plan.referencesToRemove) {
          await port.removeReferences(pickingId, referenceIds);
        }
        if (run.split !== null) {
          await port.applyMoveSplit(run.split);
          await port.writeLines(run.lineWrites);
          await port.unlinkMoves(run.split.moveOrigIds.map((moveOrigId) => ({ moveOrigId, moveDestId: outId })));
        }
        await port.setProcureMethod([outId], PROCURE_METHOD.MAKE_TO_STOCK);
        await port.recompute(run.split === null ? [outId] : [outId, run.split.newMoveId], touchedLineIds(run.lineWrites));
      },
    );
    await journal.step(
      'unallocate:reserve',
      async () => null,
      () => port.unreserveMoves([run.plan.unreserve]),
    );
  };

  // Finishes a stopped run that passed its commit point, then frees the other
  // transfers it held. A run stopped before its first write only frees them.
  // A claim with no stored run (another transfer's, or one a forecast
  // reservation took) is just freed.
  const finishStopped = async (journal: ClaimJournal) => {
    const run = journal.resumed ? await journal.step<Planned | null>(PLAN_STEP, async () => null, async () => {}) : null;

    if (run === null || run.kind === 'refuse') {
      return;
    }
    if (journal.committed) {
      await finishRun(run, journal);
    }
    await port.claims.releaseClaims(run.memberKeys, run.claimRunId);
  };

  const resumeKey = async (key: string) => {
    await port.claims.withClaim(key, async (runId) => finishStopped(await port.claims.openJournal(key, runId)));
  };

  // Another transfer's claim of a stopped run is settled by finishing that run
  // first; while that run still goes, the transfer stays held.
  const settle = (key: string) => port.claims.settleOwnedClaim(key, resumeKey);

  // A click that takes over a stopped run on its first transfer finishes that
  // run, not its own allocation, so it is told to try again.
  const runFresh = async (
    kind: AllocationRun['kind'],
    request: AllocationRequest,
    mainKey: string,
    memberKeys: string[],
    runId: string,
  ): Promise<Planned | Held> => {
    const journal = await port.claims.openJournal(mainKey, runId);

    if (journal.resumed) {
      await finishStopped(journal);
      return HELD;
    }
    const members = await port.claims.takeClaims(memberKeys, runId, { steps: {}, owner: mainKey });

    if (members.held.length > 0 || members.stale.length > 0) {
      await port.claims.releaseClaims(members.taken, runId);
      return HELD;
    }
    let committed = false;

    try {
      if ((await port.claims.heldClaimKeys(otherFlowKeys([mainKey, ...memberKeys]))).length > 0) {
        await port.claims.releaseClaims(members.taken, runId);
        return HELD;
      }
      const run = await journal.step<Planned>(PLAN_STEP, () => planRun(kind, request, runId, memberKeys), async () => {});

      if (run.kind === 'refuse') {
        await port.claims.releaseClaims(members.taken, runId);
        return run;
      }
      await journal.commit();
      committed = true;
      await finishRun(run, journal);
      await port.claims.releaseClaims(members.taken, runId);

      return run;
    } catch (error) {
      // Before the commit point nothing was written: the other transfers are
      // free again. After it they stay held until the resume finishes the run.
      if (!committed) {
        await port.claims.releaseClaims(members.taken, runId).catch(() => undefined);
      }
      throw error;
    }
  };

  const run = async (kind: AllocationRun['kind'], request: AllocationRequest): Promise<AllocationRun> => {
    const [mainKey, ...memberKeys] = await keysOf(request);

    // A first transfer still held for a stopped run: that run is finished, not this click's.
    if ((await settle(mainKey)) !== 'none') {
      throw new StockUserError(CLAIM_HELD_MESSAGE);
    }
    const outcome = await port.claims.withClaim(mainKey, (runId) => runFresh(kind, request, mainKey, memberKeys, runId));

    if (outcome.kind === 'held' || outcome.result.kind === 'held') {
      throw new StockUserError(CLAIM_HELD_MESSAGE);
    }
    if (outcome.result.kind === 'refuse') {
      throw new StockUserError(outcome.result.message, outcome.result.values);
    }
    return outcome.result;
  };

  // Links incoming moves to delivery moves (the deliveries become make to
  // order, split when only part of their demand is allocated), then reserves
  // the deliveries again.
  const allocate = (request: AllocationRequest) => run('allocate', request);

  // Takes incoming moves off a delivery move, which takes from stock again
  // and is unreserved; a part other incoming moves still feed stays linked.
  const unallocate = (entry: AllocationRequest[number]) => run('unallocate', [entry]);

  // The daily job finishes a stopped run from its stored plan, and frees the
  // claims of transfers no stored run needs.
  const resumeAllocation = async (recordId: string) => {
    const key = claimKey(ALLOCATE_ACTION, recordId);

    if ((await settle(key)) !== 'running') {
      await resumeKey(key);
    }
  };

  return { allocate, unallocate, resumeAllocation };
};

// A copy keeps everything that says where the goods are and what holds them;
// only its move and quantity differ.
const LINE_COPY_FIELDS = [
  'name',
  'pickingId',
  'productId',
  'productUomId',
  'picked',
  'date',
  'ownerId',
  'lotId',
  'packageId',
  'resultPackageId',
  'locationId',
  'locationDestId',
  'state',
] as const;

// Written as the app; the route has checked the user can read every move asked for.
const allocationPort: AllocationPort = {
  claims: { withClaim, openJournal, takeClaims, releaseClaims, settleOwnedClaim, heldClaimKeys },
  digits: () => readStockSettings().productUnitDigits,
  uoms: readResolvedUoms,
  readMovePickingIds,
  readInputs: readAllocationInputs,
  planMoveSplit: (moveId, quantity, target) => planMoveSplit(moveId, quantity, target),
  applyMoveSplit,
  writeLines: async (writes) => {
    for (const write of writes) {
      if (write.kind === 'move') {
        await stockMoveLines.update(write.lineId, { moveId: write.moveId });
        continue;
      }
      const [line] = await stockMoveLines.find<MoveLineRow>({ id: { eq: write.lineId } }, MOVE_LINE_ROW);

      await stockMoveLines.update(write.lineId, { quantity: write.quantity, moveId: write.moveId });
      if (line !== undefined) {
        await createMissingRows(stockMoveLines, [
          {
            id: write.copyId,
            data: {
              ...Object.fromEntries(LINE_COPY_FIELDS.map((field) => [field, line[field]])),
              moveId: write.copyMoveId,
              quantity: write.copyQuantity,
            },
          },
        ]);
      }
    }
  },
  linkMoves,
  unlinkMoves,
  setProcureMethod: (moveIds, procureMethod) => stockMoves.updateMany(moveIds, { procureMethod }),
  // A reference added to a transfer goes on every move of it.
  addReferences: async (pickingId, referenceIds) => {
    const moves = await stockMoves.find<{ id: string }>({ pickingId: { eq: pickingId } }, 'id');
    const existing = await readMoveReferences(moves.map((move) => move.id));
    const missing = moves.flatMap((move) =>
      referenceIds
        .filter((referenceId) => !(existing.get(move.id) ?? []).includes(referenceId))
        .map((referenceId) => ({ moveId: move.id, referenceId })),
    );

    if (missing.length > 0) {
      await stockReferenceMoveRels.createMany(missing);
    }
  },
  removeReferences: async (pickingId, referenceIds) => {
    const moves = await stockMoves.find<{ id: string }>({ pickingId: { eq: pickingId } }, 'id');
    const links = await stockReferenceMoveRels.find<{ id: string }>(
      { moveId: { in: moves.map((move) => move.id) }, referenceId: { in: referenceIds } },
      'id',
    );

    await stockReferenceMoveRels.destroyMany(links.map((link) => link.id));
  },
  recompute: async (moveIds, lineIds) => {
    await recomputeMove(moveIds);
    const lines = await stockMoveLines.find<MoveLineRow>({ id: { in: lineIds } }, MOVE_LINE_ROW);
    const products = await readStockProducts(lines.map((line) => line.productId));

    await recomputeReserved(
      distinct(lines.filter((line) => products.get(line.productId)?.isStorable === true).map((line) => sourceKeyOf(line))),
    );
    const moves = await stockMoves.find<{ pickingId: string | null }>({ id: { in: moveIds } }, 'pickingId');

    await recomputePickingState(distinct(moves.flatMap((move) => (move.pickingId === null ? [] : [move.pickingId]))));
  },
  assignMoves,
  unreserveMoves,
};

export const { allocate, unallocate, resumeAllocation } = makeAllocation(allocationPort);
