import { claimKey, CLAIM_HELD_MESSAGE, heldClaimKeys, openJournal, withClaim } from 'src/shared/claims/claim';
import { doneMoves } from 'src/stock/move/actions/done-moves';
import { retryWaitingMoves } from 'src/stock/move/actions/retry-waiting-moves';
import { createBackorder } from 'src/stock/picking/actions/create-backorder';
import { logLessQuantities } from 'src/stock/picking/actions/log-less-quantities';
import { prepareValidate } from 'src/stock/picking/actions/prepare-validate';
import { recomputePickingState } from 'src/stock/picking/recompute-picking-state';
import { autoprint, receptionReportToShow } from 'src/stock/printing/autoprint';
import { settleAllocations } from 'src/stock/reports/reception/allocation-holds';
import { sendDeliveryConfirmation } from 'src/stock/printing/send-delivery-confirmation';
import { DEFAULT_PRINT_TIME_ZONE } from 'src/stock/printing/utils/print-dates.util';
import { recomputeReserved } from 'src/stock/quant/recompute-reserved';
import { sourceKeyOf } from 'src/stock/quant/quant-key';
import { afterValidateBatch } from 'src/stock-picking-batch/after-validate-batch';
import { MOVE_STATE, PICKING_STATE, PICKING_TYPE_CODE, PRIORITY } from 'src/stock/stock-options.constant';
import { stockMoveLines, stockMoves, stockPickings } from 'src/stock/stock-records';
import { MOVE_LINE_ROW, MOVE_ROW, PICKING_ROW } from 'src/stock/stock-rows';
import { nowIso } from 'src/stock/stock-settings';
import { planOwnerOnTransferDone } from 'src/stock/utils/plan-consignment.util';
import { type ClaimJournal } from 'src/shared/claims/types/claim-journal.type';
import { type DoneMovesOptions } from 'src/stock/move/types/done-moves-options.type';
import { type DoneMovesResult } from 'src/stock/move/types/done-moves-result.type';
import { type PreparedValidate } from 'src/stock/picking/types/prepared-validate.type';
import { type ValidateOptions } from 'src/stock/picking/types/validate-options.type';
import { type ValidateResult } from 'src/stock/picking/types/validate-result.type';
import { type ValidateRunStore } from 'src/stock/picking/types/validate-run-store.type';
import { type PrintLink } from 'src/stock/printing/types/print-link.type';
import { type MoveLineRow } from 'src/stock/types/move-line-row.type';
import { type MoveRow } from 'src/stock/types/move-row.type';
import { type PickingRow } from 'src/stock/types/picking-row.type';
import { type PickingTypeCode } from 'src/stock/types/picking-type-code.type';

type ValidatePickingsDeps = {
  prepareValidate: (pickingIds: string[], options: ValidateOptions) => Promise<PreparedValidate | Exclude<ValidateResult, { kind: 'done' }>>;
  withClaim: <TResult>(key: string, run: (runId: string) => Promise<TResult>) => Promise<{ kind: 'done'; result: TResult } | { kind: 'held' }>;
  openJournal: (key: string, runId: string) => Promise<ClaimJournal>;
  heldClaimKeys: (keys: string[]) => Promise<string[]>;
  // Finishes, or frees, a stopped allocation on these transfers.
  settleAllocations: (pickingIds: string[]) => Promise<void>;
  runStore: ValidateRunStore;
  doneMoves: (moveIds: string[], options: DoneMovesOptions) => Promise<DoneMovesResult>;
  createBackorder: (
    pickingId: string,
    moveIds: string[] | null,
    journal: ClaimJournal,
    stepName: string,
    batchContext?: { validatingIds: string[]; pickingsToDetach: string[] },
  ) => Promise<string | null>;
  retryWaitingMoves: (doneMoveIds: string[]) => Promise<void>;
  logLessQuantities: (pickingIds: string[], locale: string | null) => Promise<void>;
  autoprint: (pickingIds: string[], timeZone: string) => Promise<PrintLink[]>;
  receptionReportToShow: (pickingIds: string[]) => Promise<string[]>;
  afterValidateBatch: (args: { pickingIds: string[]; batchesToValidate: string[]; pickingsToDetach: string[] }) => Promise<void>;
  sendDeliveryConfirmation: (pickingIds: string[]) => Promise<void>;
};

// What the click asked of one transfer; stored in the plan so a resume does the same.
type RunRequest = {
  noBackorder: boolean;
  logLessQuantities: boolean;
  validatingIds: string[];
  pickingsToDetach: string[];
  batchesToValidate: string[];
};
type RunPlan = RunRequest & {
  skip: boolean;
  moveIds: string[];
  ownerId: string | null;
  pickingTypeCode: PickingTypeCode | null;
  now: string;
};
type RunOutcome = {
  done: boolean;
  backorderId: string | null;
  batchesToValidate: string[];
  pickingsToDetach: string[];
  allocating?: boolean;
};

const SKIPPED: RunOutcome = { done: false, backorderId: null, batchesToValidate: [], pickingsToDetach: [] };
const ALLOCATING: RunOutcome = { ...SKIPPED, allocating: true };

const allocationKeys = (pickingIds: string[]) => pickingIds.map((pickingId) => claimKey('allocate', pickingId));

export const makeValidatePickings = (deps: ValidatePickingsDeps) => {
  // `request` null: a resume, which finishes only a run that passed its commit point; a run that
  // stopped before it wrote nothing, and its claim is freed.
  const runPicking = async (pickingId: string, runId: string, request: RunRequest | null): Promise<RunOutcome> => {
    const journal = await deps.openJournal(claimKey('validate', pickingId), runId);

    if (request === null && !journal.committed) {
      return SKIPPED;
    }
    // Checked once this transfer is held, so an allocation that starts now
    // sees this run and waits, and one already running is waited for.
    if (request !== null && !journal.resumed && (await deps.heldClaimKeys(allocationKeys([pickingId]))).length > 0) {
      return ALLOCATING;
    }
    const plan = await journal.step<RunPlan>(
      'validate:plan',
      async () => {
        const picking = request === null ? null : await deps.runStore.readPickingForRun(pickingId);
        const base = {
          noBackorder: false,
          logLessQuantities: false,
          validatingIds: [pickingId],
          pickingsToDetach: [],
          batchesToValidate: [],
          ...request,
          now: deps.runStore.now(),
        };

        return picking === null || picking.state === PICKING_STATE.DONE || picking.state === PICKING_STATE.CANCEL
          ? { ...base, skip: true, moveIds: [], ownerId: null, pickingTypeCode: null }
          : { ...base, skip: false, moveIds: picking.moveIds, ownerId: picking.ownerId, pickingTypeCode: picking.pickingTypeCode };
      },
      async () => {},
    );

    if (plan.skip) {
      return SKIPPED;
    }
    await journal.commit();

    // Before the moves are done: the task compares what was picked with the demand.
    await journal.step(
      'validate:log',
      async () => plan.logLessQuantities,
      async (log) => {
        if (log) {
          await deps.logLessQuantities([pickingId], null);
        }
      },
    );
    const ownerId = plan.ownerId;

    if (ownerId !== null) {
      await journal.step(
        'validate:owner',
        () => deps.runStore.readOwnerChange(plan.moveIds, ownerId),
        async ({ moveIds, lineIds, keys }) => {
          await deps.runStore.writeOwner({ moveIds, lineIds, ownerId });
          await deps.runStore.recomputeReserved(keys);
        },
      );
    }
    const done = await deps.doneMoves(plan.moveIds, {
      cancelBackorder: plan.noBackorder,
      journal,
      stepPrefix: 'validate:done',
      retryWaiting: false,
      siblingPickingIds: plan.validatingIds.filter((id) => id !== pickingId),
    });
    await journal.step(
      'validate:picking',
      async () => plan.now,
      async (now) => {
        await deps.runStore.recomputePickingState([pickingId]);
        await deps.runStore.updatePicking(pickingId, { dateDone: now, priority: PRIORITY.NORMAL });
      },
    );
    const backorderId = plan.noBackorder
      ? null
      : await deps.createBackorder(pickingId, null, journal, 'validate:backorder', {
          validatingIds: plan.validatingIds,
          pickingsToDetach: plan.pickingsToDetach,
        });

    // Waiting moves are retried moves after the backorder exists, for incoming and internal transfers.
    await journal.step(
      'validate:retry',
      async () => plan.pickingTypeCode === PICKING_TYPE_CODE.INCOMING || plan.pickingTypeCode === PICKING_TYPE_CODE.INTERNAL,
      async (retry) => {
        if (retry && done.doneMoveIds.length > 0) {
          await deps.retryWaitingMoves(done.doneMoveIds);
        }
      },
    );
    await journal.step(
      'validate:after',
      async () => plan.pickingTypeCode,
      async (code) => {
        if (code === PICKING_TYPE_CODE.OUTGOING) {
          await deps.sendDeliveryConfirmation([pickingId]);
        }
      },
    );

    return { done: true, backorderId, batchesToValidate: plan.batchesToValidate, pickingsToDetach: plan.pickingsToDetach };
  };

  // The batch hook runs with what the stopped click asked, so a batch still closes after a resume.
  const resumeRun = async (pickingId: string) => {
    const outcome = await deps.withClaim(claimKey('validate', pickingId), (runId) => runPicking(pickingId, runId, null));

    if (outcome.kind === 'done' && outcome.result.done) {
      await deps.afterValidateBatch({
        pickingIds: [pickingId],
        batchesToValidate: outcome.result.batchesToValidate,
        pickingsToDetach: outcome.result.pickingsToDetach,
      });
    }
    return outcome;
  };

  const resumeValidate = async (pickingId: string) => {
    await resumeRun(pickingId);
  };

  // A run that stopped after the transfer was made done still holds its claim: the checks would answer
  // "already done" and leave its last steps undone, so the click finishes that run first.
  const stoppedDoneIds = async (pickingIds: string[]) => {
    const held = new Set(await deps.heldClaimKeys(pickingIds.map((id) => claimKey('validate', id))));
    const stopped: string[] = [];

    for (const pickingId of pickingIds.filter((id) => held.has(claimKey('validate', id)))) {
      if ((await deps.runStore.readPickingForRun(pickingId))?.state === PICKING_STATE.DONE) {
        stopped.push(pickingId);
      }
    }
    return stopped;
  };

  const validatePickings = async (pickingIds: string[], options: ValidateOptions): Promise<ValidateResult> => {
    // A transfer an allocation is changing is not validated until it ends.
    await deps.settleAllocations(pickingIds);
    if ((await deps.heldClaimKeys(allocationKeys(pickingIds))).length > 0) {
      return { kind: 'refused', reason: CLAIM_HELD_MESSAGE };
    }
    const stopped = await stoppedDoneIds(pickingIds);
    const remaining = pickingIds.filter((id) => !stopped.includes(id));
    const prepared =
      remaining.length === 0
        ? { kind: 'ready' as const, pickingIds: [], noBackorderIds: [], askedIds: [] }
        : await deps.prepareValidate(remaining, options);

    // A question or a refusal goes back before anything runs; the stopped runs finish with the answered click.
    if (prepared.kind !== 'ready') {
      return prepared;
    }
    const backorderIds: string[] = [];
    const doneIds: string[] = [];
    let held = false;

    for (const pickingId of stopped) {
      const outcome = await resumeRun(pickingId);

      if (outcome.kind === 'held') {
        held = true;
      } else if (outcome.result.done) {
        doneIds.push(pickingId);
        if (outcome.result.backorderId !== null) {
          backorderIds.push(outcome.result.backorderId);
        }
      }
    }
    const noBackorder = new Set(prepared.noBackorderIds);
    // Short quantities are logged for the transfers answered "no backorder"; the "No backorder" button logs every
    // transfer of the validation.
    const logged = new Set(
      options.logEveryTransfer === true ? prepared.pickingIds : options.cancelBackorder === true ? prepared.askedIds : [],
    );
    const validatedIds: string[] = [];

    for (const pickingId of prepared.pickingIds) {
      const outcome = await deps.withClaim(claimKey('validate', pickingId), (runId) =>
        runPicking(pickingId, runId, {
          noBackorder: noBackorder.has(pickingId),
          logLessQuantities: logged.has(pickingId),
          validatingIds: prepared.pickingIds,
          pickingsToDetach: options.pickingsToDetach ?? [],
          batchesToValidate: options.batchesToValidate ?? [],
        }),
      );

      if (outcome.kind === 'held' || outcome.result.allocating === true) {
        held = true;
        continue;
      }
      if (outcome.result.done) {
        validatedIds.push(pickingId);
      }
      if (outcome.result.backorderId !== null) {
        backorderIds.push(outcome.result.backorderId);
      }
    }

    if (options.skipBatchHook !== true) {
      await deps.afterValidateBatch({
        pickingIds: validatedIds,
        batchesToValidate: options.batchesToValidate ?? [],
        pickingsToDetach: options.pickingsToDetach ?? [],
      });
    }
    doneIds.push(...validatedIds);

    if (held) {
      return { kind: 'refused', reason: CLAIM_HELD_MESSAGE };
    }
    if (options.skipPrints === true) {
      return { kind: 'done', backorderIds, doneIds, printouts: [] };
    }
    const printouts = await deps.autoprint(doneIds, options.printTimeZone ?? DEFAULT_PRINT_TIME_ZONE);
    const showReceptionReport = await deps.receptionReportToShow(doneIds);

    return showReceptionReport.length > 0
      ? { kind: 'done', backorderIds, doneIds, printouts, showReceptionReport }
      : { kind: 'done', backorderIds, doneIds, printouts };
  };

  return { validatePickings, resumeValidate };
};

const isLive = (move: MoveRow) => move.state !== MOVE_STATE.DONE && move.state !== MOVE_STATE.CANCEL;

const graphqlValidateRunStore: ValidateRunStore = {
  readPickingForRun: async (pickingId) => {
    const [picking] = await stockPickings.find<PickingRow>({ id: { eq: pickingId } }, PICKING_ROW);

    if (picking === undefined) {
      return null;
    }
    const moves = (await stockMoves.find<MoveRow>({ pickingId: { eq: pickingId } }, MOVE_ROW)).filter(isLive);

    return {
      id: picking.id,
      state: picking.state,
      ownerId: picking.ownerId,
      pickingTypeCode: picking.pickingTypeCode,
      moveIds: moves.map((move) => move.id),
    };
  },
  readOwnerChange: async (moveIds, ownerId) => {
    const notOwned = (field: string) => ({ or: [{ [field]: { is: 'NULL' } }, { [field]: { neq: ownerId } }] });
    const moves = moveIds.length === 0 ? [] : await stockMoves.find<MoveRow>({ id: { in: moveIds }, ...notOwned('restrictPartnerId') }, MOVE_ROW);
    const lines =
      moveIds.length === 0 ? [] : await stockMoveLines.find<MoveLineRow>({ moveId: { in: moveIds }, ...notOwned('ownerId') }, MOVE_LINE_ROW);
    const { moveUpdates, lineUpdates } = planOwnerOnTransferDone({ pickingOwnerId: ownerId, moves, lines });
    const changedLineIds = new Set(lineUpdates.map((update) => update.id));

    return {
      moveIds: moveUpdates.map((update) => update.id),
      lineIds: lineUpdates.map((update) => update.id),
      keys: [
        ...new Set(lines.filter((line) => changedLineIds.has(line.id)).flatMap((line) => [sourceKeyOf(line), sourceKeyOf({ ...line, ownerId })])),
      ],
    };
  },
  writeOwner: async ({ moveIds, lineIds, ownerId }) => {
    await stockMoves.updateMany(moveIds, { restrictPartnerId: ownerId });
    await stockMoveLines.updateMany(lineIds, { ownerId });
  },
  recomputeReserved,
  recomputePickingState,
  updatePicking: (pickingId, data) => stockPickings.update(pickingId, data),
  now: nowIso,
};

export const { validatePickings, resumeValidate } = makeValidatePickings({
  prepareValidate,
  withClaim,
  openJournal,
  heldClaimKeys,
  settleAllocations,
  runStore: graphqlValidateRunStore,
  doneMoves,
  createBackorder,
  retryWaitingMoves,
  logLessQuantities,
  autoprint,
  receptionReportToShow,
  afterValidateBatch,
  sendDeliveryConfirmation,
});
