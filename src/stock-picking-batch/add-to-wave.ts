import { claimKey, openJournal, releaseClaims, settleOwnedClaim, takeClaims, withClaim } from 'src/shared/claims/claim';
import { createMissingRows } from 'src/shared/claims/create-missing-rows';
import { type ClaimJournal } from 'src/shared/claims/types/claim-journal.type';
import { updateWhere } from 'src/shared/compare-and-set';
import { type TranslationValues } from 'src/shared/i18n/types/translation-values.type';
import { derivedId } from 'src/shared/utils/derived-id.util';
import { nextNumber } from 'src/base/sequence/next-number';
import { confirmBatch } from 'src/stock-picking-batch/confirm-batch';
import { readBatchName } from 'src/stock-picking-batch/read-batch-name';
import { readWaveBatchIds } from 'src/stock-picking-batch/read-wave-batch-ids';
import { recomputeBatchState } from 'src/stock-picking-batch/recompute-batch-state';
import { BATCH_MESSAGES } from 'src/stock-picking-batch/stock-picking-batch-messages.constant';
import { BATCH_STATE } from 'src/stock-picking-batch/stock-picking-batch-options.constant';
import {
  stockMoveLines,
  stockMoves,
  stockPickingBatches,
  stockPickings,
  stockPickingTypes,
} from 'src/stock-picking-batch/stock-picking-batch-records';
import { type AddToWavePort } from 'src/stock-picking-batch/types/add-to-wave-port.type';
import { type BatchForCheck } from 'src/stock-picking-batch/types/batch-for-check.type';
import { type BatchState } from 'src/stock-picking-batch/types/batch-state.type';
import { type WaveLine } from 'src/stock-picking-batch/types/wave-line.type';
import { incompatiblePickings } from 'src/stock-picking-batch/utils/allowed-pickings.util';
import { planAddToWave } from 'src/stock-picking-batch/utils/plan-add-to-wave.util';
import { applyMoveSplit, planMoveSplit } from 'src/stock/move/actions/split-move';
import { recomputeMove } from 'src/stock/move/recompute-move';
import { type MoveSplitPlan } from 'src/stock/move/types/move-split-plan.type';
import { recomputePickingState } from 'src/stock/picking/recompute-picking-state';
import { readStockProducts } from 'src/stock/product/read-stock-products';
import { filterReadableIds } from 'src/stock/stock-access';
import { StockUserError } from 'src/stock/stock-errors';
import { PICKING_ROW } from 'src/stock/stock-rows';
import { readStockSettings } from 'src/stock/stock-settings';
import { readResolvedUoms } from 'src/stock/stock-uoms';
import { type PickingRow } from 'src/stock/types/picking-row.type';
import { lineQuantityInProductUnit } from 'src/stock/utils/line-quantity-in-product-unit.util';

type WaveRequest = {
  lineIds: string[];
  waveId: string | null;
  responsibleId: string | null;
  description: string | null;
  actingMemberId: string | null;
};
type WaveSplit = {
  pickingId: string;
  newPickingId: string;
  pickingValues: Record<string, unknown>;
  wholeMoveIds: string[];
  wholeMoveLineIds: string[];
  parts: MoveSplitPlan[];
};
type WavePlan = {
  kind: 'wave';
  waveId: string;
  newWave: { isWave: true; pickingTypeId: string | null; responsibleId: string | null; description: string | null } | null;
  // Set when the chosen wave has no operation type yet.
  typeWave: string | null;
  pickingTypeId: string | null;
  wholePickingIds: string[];
  splits: WaveSplit[];
  // The other lines' claims, and the run that took them, to free once the wave is done.
  memberKeys: string[];
  claimRunId: string;
};
type Refusal = { kind: 'refuse'; message: string; values: TranslationValues };
type WaveDone = { kind: 'done'; waveId: string; waveName: string; created: boolean };
type Held = { kind: 'held' };

const PLAN_STEP = 'wave:plan';
const OPEN_BATCH_STATES = new Set<string>([BATCH_STATE.DRAFT, BATCH_STATE.IN_PROGRESS]);
const HELD: Held = { kind: 'held' };

const refuse = (message: string, values: TranslationValues = {}): Refusal => ({ kind: 'refuse', message, values });

// `readWaveBatchIds` is given for auto wave: a line whose transfer is already
// in a wave stays there, since the run was planned before that wave took it.
export const makeAddToWave = (port: AddToWavePort, options: { readWaveBatchIds?: (batchIds: string[]) => Promise<Set<string>> } = {}) => {
  // Reads only. Every id the run makes is chosen here, so a rerun after a stop
  // finds the rows it made instead of making them again.
  const planWave = async (request: WaveRequest, runId: string, memberKeys: string[]): Promise<WavePlan | Refusal | Held> => {
    const asked = await port.readLines(request.lineIds);

    if (asked.length === 0 || asked.some((line) => line.pickingId === null || line.moveId === null)) {
      return refuse(BATCH_MESSAGES.noWaveLines);
    }
    const pickingIds = [...new Set(asked.map((line) => line.pickingId as string))];
    const contents = await port.readPickings(pickingIds);
    const pickingById = new Map(contents.pickings.map((picking) => [picking.id, picking]));
    const waveBatchIds =
      options.readWaveBatchIds === undefined
        ? new Set<string>()
        : await options.readWaveBatchIds(contents.pickings.flatMap((picking) => (picking.batchId === null ? [] : [picking.batchId])));
    const lines = asked.filter((line) => !waveBatchIds.has(pickingById.get(line.pickingId as string)?.batchId ?? ''));

    if (lines.length === 0) {
      return HELD;
    }
    const typeIds = new Set(contents.pickings.flatMap((picking) => (picking.pickingTypeId === null ? [] : [picking.pickingTypeId])));

    if (typeIds.size > 1) {
      return refuse(BATCH_MESSAGES.sameType);
    }
    // A new wave, or an open wave with no type, takes the operation type of the first chosen line.
    const firstTypeId = pickingById.get(lines[0].pickingId as string)?.pickingTypeId ?? null;
    let target: BatchForCheck = { name: '', state: BATCH_STATE.DRAFT, pickingTypeId: firstTypeId };
    let typeWave: string | null = null;

    if (request.waveId !== null) {
      const wave = await port.readWave(request.waveId);

      if (wave === undefined) {
        return refuse(BATCH_MESSAGES.notFound);
      }
      if (!wave.isWave || !OPEN_BATCH_STATES.has(wave.state)) {
        return refuse(BATCH_MESSAGES.chooseWave);
      }
      target = { name: wave.name, state: wave.state, pickingTypeId: wave.pickingTypeId ?? firstTypeId };
      typeWave = wave.pickingTypeId === null ? firstTypeId : null;
    }
    // Lines whose transfer is already in the wave stay where they are.
    const joining = lines.flatMap((line): WaveLine[] => {
      const picking = pickingById.get(line.pickingId as string);

      return picking === undefined || (request.waveId !== null && picking.batchId === request.waveId)
        ? []
        : [{ id: line.id, pickingId: picking.id, moveId: line.moveId as string, quantityProductUom: line.quantityProductUom }];
    });
    const joiningPickings = contents.pickings.filter((picking) => joining.some((line) => line.pickingId === picking.id));
    const refused = incompatiblePickings(target, joiningPickings);

    if (refused.length > 0) {
      return refuse(BATCH_MESSAGES.incompatible, { batch: target.name, transfers: refused.join(', ') });
    }
    const waveId = request.waveId ?? derivedId('addToWave', runId);
    const planned = planAddToWave({
      lines: joining,
      pickings: joiningPickings.map((picking) => ({
        id: picking.id,
        lineIds: contents.lines.filter((line) => line.pickingId === picking.id).map((line) => line.id),
        moveIds: contents.moves.filter((move) => move.pickingId === picking.id).map((move) => move.id),
      })),
      moves: contents.moves.map((move) => ({
        id: move.id,
        lineIds: contents.lines.filter((line) => line.moveId === move.id).map((line) => line.id),
      })),
      digits: port.digits(),
    });
    const splits: WaveSplit[] = [];

    for (const split of planned.splits) {
      const source = pickingById.get(split.pickingId);

      if (source === undefined) {
        continue;
      }
      const newPickingId = derivedId('addToWave', runId, split.pickingId);
      const parts: MoveSplitPlan[] = [];

      for (const part of split.splitMoves) {
        parts.push(await port.planMoveSplit(part.moveId, part.quantity, { lineIds: part.lineIds, pickingId: newPickingId }));
      }
      splits.push({
        pickingId: split.pickingId,
        newPickingId,
        // Made in the wave, with the clicking user as its responsible.
        pickingValues: { ...source.copyValues, batchId: waveId, responsibleUserId: request.actingMemberId },
        wholeMoveIds: split.wholeMoveIds,
        wholeMoveLineIds: contents.lines
          .filter((line) => line.moveId !== null && split.wholeMoveIds.includes(line.moveId))
          .map((line) => line.id),
        parts,
      });
    }

    return {
      kind: 'wave',
      waveId,
      newWave:
        request.waveId === null
          ? { isWave: true, pickingTypeId: firstTypeId, responsibleId: request.responsibleId, description: request.description }
          : null,
      typeWave,
      pickingTypeId: target.pickingTypeId,
      wholePickingIds: planned.wholePickingIds,
      splits,
      memberKeys,
      claimRunId: runId,
    };
  };

  // The writes after the commit point, each a step a rerun can repeat.
  const finishWave = async (plan: WavePlan, journal: ClaimJournal): Promise<WaveDone> => {
    await journal.step(
      'wave:batch',
      async () => null,
      async () => {
        if (plan.newWave !== null) {
          await port.createWave(plan.waveId, plan.newWave);
        } else if (plan.typeWave !== null) {
          await port.typeWave(plan.waveId, plan.typeWave);
        }
      },
    );
    await journal.step(
      'wave:whole',
      async () => null,
      () => port.joinWave(plan.wholePickingIds, plan.waveId),
    );
    for (const split of plan.splits) {
      await journal.step(
        `wave:split:${split.pickingId}`,
        async () => null,
        async () => {
          await port.createSplitPicking(split.newPickingId, split.pickingValues);
          await port.moveToPicking(split.wholeMoveIds, split.wholeMoveLineIds, split.newPickingId);
          for (const part of split.parts) {
            await port.applyMoveSplit(part);
          }
          await port.recomputePickingState([split.pickingId, split.newPickingId]);
        },
      );
    }
    await journal.step(
      'wave:finish',
      async () => null,
      async () => {
        if (await port.readAutoConfirm(plan.waveId, plan.pickingTypeId)) {
          await port.confirmBatch(plan.waveId);
        } else {
          await port.recomputeBatchState([plan.waveId]);
        }
      },
    );

    return { kind: 'done', waveId: plan.waveId, waveName: await port.readBatchName(plan.waveId), created: plan.newWave !== null };
  };

  // Finishes a stopped run that passed its commit point, then frees the other
  // lines it held. A run stopped before its first write only frees them. A
  // claim with no stored wave (another line's claim) is just freed.
  const finishStopped = async (journal: ClaimJournal) => {
    const plan = journal.resumed
      ? await journal.step<WavePlan | Refusal | Held | null>(PLAN_STEP, async () => null, async () => {})
      : null;

    if (plan?.kind !== 'wave') {
      return;
    }
    if (journal.committed) {
      await finishWave(plan, journal);
    }
    await port.claims.releaseClaims(plan.memberKeys, plan.claimRunId);
  };

  const resumeKey = async (key: string) => {
    await port.claims.withClaim(key, async (runId) => finishStopped(await port.claims.openJournal(key, runId)));
  };

  // Another line's claim of a stopped run is settled by finishing that run
  // first; while that run still goes, the line stays held.
  const settle = (key: string) => port.claims.settleOwnedClaim(key, resumeKey);

  // A click that takes over a stopped run of its first line finishes that
  // run, not its own lines, so it is told to try again.
  const runFresh = async (mainKey: string, memberKeys: string[], runId: string, request: WaveRequest) => {
    const journal = await port.claims.openJournal(mainKey, runId);

    if (journal.resumed) {
      await finishStopped(journal);
      return HELD;
    }
    // Every chosen line is held, so two selections that share a line never split one move twice.
    const members = await port.claims.takeClaims(memberKeys, runId, { steps: {}, owner: mainKey });

    if (members.held.length > 0 || members.stale.length > 0) {
      await port.claims.releaseClaims(members.taken, runId);
      return HELD;
    }
    let committed = false;

    try {
      const plan = await journal.step<WavePlan | Refusal | Held>(PLAN_STEP, () => planWave(request, runId, memberKeys), async () => {});

      if (plan.kind === 'refuse' || plan.kind === 'held') {
        await port.claims.releaseClaims(members.taken, runId);
        return plan;
      }
      await journal.commit();
      committed = true;
      const done = await finishWave(plan, journal);

      await port.claims.releaseClaims(members.taken, runId);
      return done;
    } catch (error) {
      // Before the commit point nothing was written: the other lines are free
      // again. After it their claims stay until the resume finishes the wave.
      if (!committed) {
        await port.claims.releaseClaims(members.taken, runId).catch(() => undefined);
      }
      throw error;
    }
  };

  // Puts move lines in a wave, new or open: whole transfers when all their
  // lines are chosen, otherwise a new transfer with the chosen part.
  const addToWave = async ({
    lineIds,
    waveId,
    responsibleId = null,
    description = null,
    actingMemberId = null,
  }: {
    lineIds: string[];
    waveId: string | null;
    responsibleId?: string | null;
    description?: string | null;
    actingMemberId?: string | null;
  }): Promise<WaveDone | Held> => {
    const ids = [...new Set(lineIds)];

    if (ids.length === 0) {
      throw new StockUserError(BATCH_MESSAGES.noWaveLines);
    }
    const [mainKey, ...memberKeys] = [...ids].sort().map((id) => claimKey('wave', id));

    // A first line still held for a stopped run: that run is finished, not this click's lines.
    if ((await settle(mainKey)) !== 'none') {
      return HELD;
    }
    const claimed = await port.claims.withClaim(mainKey, (runId) =>
      runFresh(mainKey, memberKeys, runId, { lineIds: ids, waveId, responsibleId, description, actingMemberId }),
    );

    if (claimed.kind === 'held' || claimed.result.kind === 'held') {
      return HELD;
    }
    if (claimed.result.kind === 'refuse') {
      throw new StockUserError(claimed.result.message, claimed.result.values);
    }
    return claimed.result;
  };

  // The daily job finishes a stopped run from its stored plan, and frees the
  // claims of lines no stored run needs.
  const resumeAddToWave = async (lineId: string) => {
    const key = claimKey('wave', lineId);

    if ((await settle(key)) !== 'running') {
      await resumeKey(key);
    }
  };

  return { addToWave, resumeAddToWave };
};

// What a transfer split off for a wave copies from it; it gets its own number.
const splitPickingValues = (picking: PickingRow & { note: unknown }) => ({
  origin: picking.origin,
  note: picking.note,
  moveType: picking.moveType,
  priority: picking.priority,
  scheduledDate: picking.scheduledDate,
  dateDeadline: picking.dateDeadline,
  locationId: picking.locationId,
  locationDestId: picking.locationDestId,
  pickingTypeId: picking.pickingTypeId,
  pickingTypeCode: picking.pickingTypeCode,
  companyId: picking.companyId,
  personId: picking.personId,
  ownerId: picking.ownerId,
});

// `note` is a rich text field; its value is copied as read.
const NOTE_SELECTION = 'note { blocknote markdown }';

type LineRow = {
  id: string;
  pickingId: string | null;
  moveId: string | null;
  productId: string;
  quantity: number | null;
  quantityProductUom: number | null;
  productUomId: string | null;
};

// A wave the clicking user cannot read is treated as gone. Auto wave runs from
// saves and jobs with no user behind them, so it reads the wave as the app.
const readWave =
  (checkAccess: boolean): AddToWavePort['readWave'] =>
  async (waveId) => {
    if (checkAccess && (await filterReadableIds('stockPickingBatch', 'stockPickingBatches', [waveId])).length === 0) {
      return undefined;
    }
    const [row] = await stockPickingBatches.find<{
      id: string;
      name: string | null;
      state: BatchState;
      isWave: boolean;
      pickingTypeId: string | null;
    }>({ id: { eq: waveId } }, 'id name state isWave pickingTypeId');

    return row === undefined ? undefined : { ...row, name: row.name ?? '' };
  };

// The wave and the transfers are written by the app, as the other batch
// buttons do; the route has checked the user can read the lines.
const addToWavePort: AddToWavePort = {
  claims: { withClaim, openJournal, takeClaims, releaseClaims, settleOwnedClaim },
  digits: () => readStockSettings().productUnitDigits,
  readLines: async (lineIds) => {
    const rows = await stockMoveLines.find<LineRow>(
      { id: { in: lineIds } },
      'id pickingId moveId productId quantity quantityProductUom productUomId',
    );
    const [products, uoms] = await Promise.all([readStockProducts(rows.map((row) => row.productId)), readResolvedUoms()]);
    const digits = readStockSettings().productUnitDigits;
    const byId = new Map(rows.map((row) => [row.id, row]));

    return lineIds.flatMap((id) => {
      const row = byId.get(id);

      return row === undefined
        ? []
        : [
            {
              id,
              pickingId: row.pickingId,
              moveId: row.moveId,
              quantityProductUom: lineQuantityInProductUnit({
                line: row,
                productUomId: products.get(row.productId)?.uomId ?? null,
                uoms,
                digits,
              }),
            },
          ];
    });
  },
  readPickings: async (pickingIds) => {
    const [pickings, lines, moves] = await Promise.all([
      stockPickings.find<PickingRow & { batchId: string | null; note: unknown }>(
        { id: { in: pickingIds } },
        `${PICKING_ROW} batchId ${NOTE_SELECTION}`,
      ),
      stockMoveLines.find<{ id: string; pickingId: string; moveId: string | null }>(
        { pickingId: { in: pickingIds } },
        'id pickingId moveId',
      ),
      stockMoves.find<{ id: string; pickingId: string }>({ pickingId: { in: pickingIds } }, 'id pickingId'),
    ]);

    return {
      pickings: pickings.map((picking) => ({
        id: picking.id,
        name: picking.name ?? '',
        state: picking.state,
        pickingTypeId: picking.pickingTypeId,
        batchId: picking.batchId,
        copyValues: splitPickingValues(picking),
      })),
      lines,
      moves,
    };
  },
  readWave: readWave(true),
  planMoveSplit,
  createWave: async (waveId, values) => {
    await createMissingRows(stockPickingBatches, [{ id: waveId, data: values }]);
  },
  // Only while the wave still has no type: a type set meanwhile stays.
  typeWave: async (waveId, pickingTypeId) => {
    await updateWhere({
      objectSingular: 'stockPickingBatch',
      objectPlural: 'stockPickingBatches',
      filter: { id: { eq: waveId }, pickingTypeId: { is: 'NULL' } },
      data: { pickingTypeId },
    });
  },
  joinWave: (pickingIds, waveId) => stockPickings.updateMany(pickingIds, { batchId: waveId }),
  createSplitPicking: async (pickingId, values) => {
    if ((await stockPickings.findIncludingDeleted<{ id: string }>({ id: { eq: pickingId } }, 'id')).length > 0) {
      return;
    }
    const pickingTypeId = typeof values.pickingTypeId === 'string' ? values.pickingTypeId : null;
    const [type] =
      pickingTypeId === null
        ? []
        : await stockPickingTypes.find<{ referenceSequenceId: string | null }>({ id: { eq: pickingTypeId } }, 'referenceSequenceId');
    const name = type?.referenceSequenceId ? await nextNumber(type.referenceSequenceId) : '/';

    await createMissingRows(stockPickings, [{ id: pickingId, data: { ...values, name } }]);
  },
  // The moves take the new transfer's name into their reference.
  moveToPicking: async (moveIds, lineIds, pickingId) => {
    await stockMoves.updateMany(moveIds, { pickingId });
    await stockMoveLines.updateMany(lineIds, { pickingId });
    await recomputeMove(moveIds);
  },
  applyMoveSplit,
  recomputePickingState,
  readAutoConfirm: async (waveId, fallbackTypeId) => {
    const [wave] = await stockPickingBatches.find<{ pickingTypeId: string | null }>({ id: { eq: waveId } }, 'pickingTypeId');
    const pickingTypeId = wave?.pickingTypeId ?? fallbackTypeId;

    if (wave === undefined || pickingTypeId === null) {
      return false;
    }
    const [type] = await stockPickingTypes.find<{ batchAutoConfirm: boolean }>({ id: { eq: pickingTypeId } }, 'batchAutoConfirm');

    return type?.batchAutoConfirm === true;
  },
  confirmBatch,
  recomputeBatchState,
  readBatchName,
};

export const { addToWave, resumeAddToWave } = makeAddToWave(addToWavePort);

// No one waits for the new wave's number, so its name is not read back.
export const { addToWave: autoAddToWave } = makeAddToWave(
  { ...addToWavePort, readWave: readWave(false), readBatchName: async () => '' },
  { readWaveBatchIds },
);
