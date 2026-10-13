import { CLAIM_HELD_MESSAGE, claimKey } from 'src/shared/claims/claim';
import { type ClaimJournal } from 'src/shared/claims/types/claim-journal.type';
import { type TranslationValues } from 'src/shared/i18n/types/translation-values.type';
import { derivedId } from 'src/shared/utils/derived-id.util';
import { type MoveSplitPlan } from 'src/stock/move/types/move-split-plan.type';
import { graphqlAllocationPort } from 'src/stock/reports/reception/graphql-allocation-port';
import { RECEPTION_MESSAGES } from 'src/stock/reports/reception/reception-messages.constant';
import { type AllocationPort } from 'src/stock/reports/reception/types/allocation-port.type';
import { type AllocationRequest } from 'src/stock/reports/reception/types/allocation-request.type';
import { type AllocationRun } from 'src/stock/reports/reception/types/allocation-run.type';
import { StockUserError } from 'src/stock/stock-errors';
import { MOVE_STATE, PROCURE_METHOD } from 'src/stock/stock-options.constant';
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

  const readOpenness = async (moveIds: string[]) => {
    const states = await port.readMoveStates(distinct(moveIds));

    return {
      exists: (moveId: string) => states.has(moveId),
      isOpen: (moveId: string) => {
        const state = states.get(moveId);

        return state !== undefined && state !== MOVE_STATE.DONE && state !== MOVE_STATE.CANCEL;
      },
      state: (moveId: string) => states.get(moveId),
    };
  };

  // A line removed or made done since the plan, or a write onto a move that
  // is no longer open, is left out: a done line's stock is already posted.
  const openLineWrites = async (writes: AllocationLineWrite[], isOpen: (moveId: string) => boolean) => {
    const lineStates = await port.readLineStates(writes.map((write) => write.lineId));

    return writes.filter((write) => {
      const state = lineStates.get(write.lineId);

      return (
        state !== undefined &&
        state !== MOVE_STATE.DONE &&
        isOpen(write.moveId) &&
        (write.kind === 'move' || isOpen(write.copyMoveId))
      );
    });
  };

  // The writes after the commit point. Each step sets planned values only, so
  // a rerun of a step that stopped half-way finishes it. A stored plan is
  // replayed as stored, never planned again; what another flow closed or
  // removed since is skipped and the rest is finished.
  const finishRun = async (run: AllocationRun, journal: ClaimJournal) => {
    if (run.kind === 'allocate') {
      await journal.step(
        'allocate:apply',
        async () => null,
        async () => {
          const before = await readOpenness(run.splits.map((split) => split.moveId));

          for (const split of run.splits.filter((planned) => before.isOpen(planned.moveId))) {
            await port.applyMoveSplit(split);
          }
          const moves = await readOpenness([
            ...run.plan.assignMoveIds,
            ...run.splits.map((split) => split.newMoveId),
            ...run.plan.links.map((link) => link.inId),
          ]);

          await port.writeLines(await openLineWrites(run.lineWrites, moves.isOpen));
          await port.linkMoves(
            run.plan.links
              .filter((link) => moves.isOpen(link.outId) && moves.exists(link.inId) && moves.state(link.inId) !== MOVE_STATE.CANCEL)
              .map((link) => ({ moveOrigId: link.inId, moveDestId: link.outId })),
          );
          await port.setProcureMethod(run.plan.makeToOrder.filter(moves.isOpen), PROCURE_METHOD.MAKE_TO_ORDER);
          for (const { pickingId, referenceIds } of run.plan.references) {
            await port.addReferences(pickingId, referenceIds);
          }
          await port.recompute(
            [...run.plan.assignMoveIds, ...run.splits.map((split) => split.newMoveId)].filter(moves.exists),
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
        const out = await readOpenness([outId]);

        if (run.split !== null && out.isOpen(outId)) {
          await port.applyMoveSplit(run.split);
          const moves = await readOpenness([outId, run.split.newMoveId]);

          await port.writeLines(await openLineWrites(run.lineWrites, moves.isOpen));
          await port.unlinkMoves(run.split.moveOrigIds.map((moveOrigId) => ({ moveOrigId, moveDestId: outId })));
        }
        if (out.isOpen(outId)) {
          await port.setProcureMethod([outId], PROCURE_METHOD.MAKE_TO_STOCK);
        }
        const touched = await readOpenness(run.split === null ? [outId] : [outId, run.split.newMoveId]);

        await port.recompute(
          (run.split === null ? [outId] : [outId, run.split.newMoveId]).filter(touched.exists),
          touchedLineIds(run.lineWrites),
        );
      },
    );
    await journal.step(
      'unallocate:reserve',
      async () => null,
      async () => {
        const out = await readOpenness([run.plan.unreserve]);

        // A delivery validated meanwhile keeps its done lines.
        if (out.exists(run.plan.unreserve) && out.state(run.plan.unreserve) !== MOVE_STATE.DONE) {
          await port.unreserveMoves([run.plan.unreserve]);
        }
      },
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

export const { allocate, unallocate, resumeAllocation } = makeAllocation(graphqlAllocationPort);
