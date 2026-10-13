import { CLAIM_HELD_MESSAGE, claimKey, heldClaimKeys, openJournal, withClaim } from 'src/shared/claims/claim';
import { type ClaimJournal } from 'src/shared/claims/types/claim-journal.type';
import { readUserLocale } from 'src/shared/i18n/read-user-locale';
import { type TranslationValues } from 'src/shared/i18n/types/translation-values.type';
import { translate } from 'src/shared/i18n/translate';
import { addNote } from 'src/shared/triggers/put-back';
import { derivedId } from 'src/shared/utils/derived-id.util';
import { afterValidateBatch } from 'src/stock-picking-batch/after-validate-batch';
import { recomputeBatchState } from 'src/stock-picking-batch/recompute-batch-state';
import { BATCH_MESSAGES } from 'src/stock-picking-batch/stock-picking-batch-messages.constant';
import { BATCH_STATE } from 'src/stock-picking-batch/stock-picking-batch-options.constant';
import { stockMoveLines, stockMoves, stockPickingBatches, stockPickings } from 'src/stock-picking-batch/stock-picking-batch-records';
import { type BatchState } from 'src/stock-picking-batch/types/batch-state.type';
import { type BatchValidateAnswer } from 'src/stock-picking-batch/types/batch-validate-answer.type';
import { planBatchValidate } from 'src/stock-picking-batch/utils/plan-batch-validate.util';
import { resumeValidate, validatePickings } from 'src/stock/picking/actions/validate-pickings';
import { type ValidateOptions } from 'src/stock/picking/types/validate-options.type';
import { type ValidateResult } from 'src/stock/picking/types/validate-result.type';
import { type ValidateRouteResult } from 'src/stock/picking/types/validate-route-result.type';
import { StockUserError } from 'src/stock/stock-errors';
import { PICKING_STATE } from 'src/stock/stock-options.constant';
import { readStockSettings } from 'src/stock/stock-settings';
import { EMPTY_TRANSFER_MESSAGE, EMPTY_TRANSFERS_MESSAGE } from 'src/stock/utils/plan-validate-checks.util';

type BatchValidatePlan =
  | { kind: 'refuse'; message: string; values?: TranslationValues }
  | {
      kind: 'validate';
      batchName: string;
      toValidateIds: string[];
      pickingsToDetach: string[];
      emptyWaitingIds: string[];
      emptyWaitingNames: string[];
      locale: string;
      answer: BatchValidateAnswer;
    };

const planRun = async (batchId: string, answer: BatchValidateAnswer): Promise<BatchValidatePlan> => {
  const [batch] = await stockPickingBatches.find<{ name: string | null; state: BatchState }>({ id: { eq: batchId } }, 'name state');

  if (batch === undefined) {
    return { kind: 'refuse', message: BATCH_MESSAGES.notFound };
  }
  const pickings = await stockPickings.find<{ id: string; name: string | null; state: string }>({ batchId: { eq: batchId } }, 'id name state');

  if (batch.state !== BATCH_STATE.IN_PROGRESS) {
    return { kind: 'refuse', message: BATCH_MESSAGES.notInProgress };
  }
  if (pickings.length === 0) {
    return { kind: 'refuse', message: BATCH_MESSAGES.noPickings };
  }
  const pickingIds = pickings.map((picking) => picking.id);
  const [moves, lines] = await Promise.all([
    stockMoves.find<{ pickingId: string; state: string; picked: boolean; quantity: number | null }>(
      { pickingId: { in: pickingIds } },
      'pickingId state picked quantity',
    ),
    stockMoveLines.find<{ pickingId: string }>({ pickingId: { in: pickingIds } }, 'pickingId'),
  ]);
  const { withoutMoves, ...plan } = planBatchValidate({
    pickings: pickings.map((picking) => ({
      id: picking.id,
      state: picking.state,
      moves: moves
        .filter((move) => move.pickingId === picking.id)
        .map((move) => ({ state: move.state, picked: move.picked, quantity: move.quantity ?? 0 })),
      lineCount: lines.filter((line) => line.pickingId === picking.id).length,
    })),
    digits: readStockSettings().productUnitDigits,
  });

  if (withoutMoves !== null) {
    return withoutMoves.listed
      ? {
          kind: 'refuse',
          message: EMPTY_TRANSFERS_MESSAGE,
          values: { names: pickings.filter((picking) => withoutMoves.ids.includes(picking.id)).map((picking) => picking.name ?? '/').join(', ') },
        }
      : { kind: 'refuse', message: EMPTY_TRANSFER_MESSAGE };
  }

  return {
    kind: 'validate',
    batchName: batch.name ?? '',
    ...plan,
    emptyWaitingNames: pickings.filter((picking) => plan.emptyWaitingIds.includes(picking.id)).map((picking) => picking.name ?? '/'),
    locale: await readUserLocale(),
    answer,
  };
};

// Their ids come from the batch and the transfer, so the click that answers a
// question, or a resume, adds none twice.
const writeNotes = async (batchId: string, plan: Extract<BatchValidatePlan, { kind: 'validate' }>) => {
  const transferredBy = translate(plan.locale, BATCH_MESSAGES.transferredBy, { batch: plan.batchName });

  for (const pickingId of plan.toValidateIds) {
    await addNote({
      objectSingular: 'stockPicking',
      recordId: pickingId,
      title: transferredBy,
      body: transferredBy,
      id: derivedId('batchValidate', batchId, pickingId),
    });
  }
  if (plan.emptyWaitingIds.length > 0) {
    const removed = translate(plan.locale, BATCH_MESSAGES.removedNoQuantity, { transfers: plan.emptyWaitingNames.join(', ') });

    await addNote({
      objectSingular: 'stockPickingBatch',
      recordId: batchId,
      title: removed,
      body: removed,
      id: derivedId('batchValidate', batchId, 'removed', ...[...plan.emptyWaitingIds].sort()),
    });
  }
};

type BatchValidateDeps = {
  withClaim: <TResult>(key: string, run: (runId: string) => Promise<TResult>) => Promise<{ kind: 'done'; result: TResult } | { kind: 'held' }>;
  openJournal: (key: string, runId: string) => Promise<ClaimJournal>;
  heldClaimKeys: (keys: string[]) => Promise<string[]>;
  planRun: (batchId: string, answer: BatchValidateAnswer) => Promise<BatchValidatePlan>;
  validatePickings: (pickingIds: string[], options: ValidateOptions) => Promise<ValidateResult>;
  resumeValidate: (pickingId: string) => Promise<void>;
  afterValidateBatch: (args: { pickingIds: string[]; batchesToValidate: string[]; pickingsToDetach: string[] }) => Promise<void>;
  readPickingStates: (pickingIds: string[]) => Promise<{ id: string; state: string }[]>;
  writeNotes: (batchId: string, plan: Extract<BatchValidatePlan, { kind: 'validate' }>) => Promise<void>;
  recomputeBatchState: (batchIds: string[]) => Promise<void>;
};

export const makeBatchValidate = (deps: BatchValidateDeps) => {
  // `answer` is null for a resume, which finishes only a run that passed its
  // commit point; one that stopped before it wrote nothing, and its claim is
  // freed. The stock moves inside Validate, under each transfer's own claim:
  // a resume first finishes those runs, then redoes the batch's part. A click
  // that takes a stopped run over finishes that run's plan, with the answer
  // stored in it.
  const runBatchValidate = async (batchId: string, runId: string, answer: BatchValidateAnswer | null, printTimeZone?: string) => {
    const journal = await deps.openJournal(claimKey('batchValidate', batchId), runId);

    if (answer === null && !journal.committed) {
      return null;
    }
    const plan = await journal.step<BatchValidatePlan>('batchValidate:plan', () => deps.planRun(batchId, answer ?? {}), async () => {});

    if (plan.kind === 'refuse') {
      return plan;
    }
    await journal.commit();
    let result: ValidateResult | null = null;

    if (answer === null) {
      for (const pickingId of plan.toValidateIds) {
        await deps.resumeValidate(pickingId);
      }
      // A transfer whose own run is still going decides the batch's part: the
      // batch claim stays, for the next pass.
      const held = await deps.heldClaimKeys(plan.toValidateIds.map((pickingId) => claimKey('validate', pickingId)));

      if (held.length > 0) {
        throw new Error(`Batch Validate waits for its transfers: ${held.join(', ')}`);
      }
    } else {
      result = await deps.validatePickings(plan.toValidateIds, {
        ...plan.answer,
        pickingsToDetach: plan.pickingsToDetach,
        batchesToValidate: [batchId],
        printTimeZone,
      });
    }
    if (answer === null || journal.resumed) {
      await deps.afterValidateBatch({ pickingIds: plan.toValidateIds, batchesToValidate: [batchId], pickingsToDetach: plan.pickingsToDetach });
    }
    // The notes follow what the click kept: a validation, a question it asked,
    // or a transfer done before it stopped. A refused click changes nothing.
    const someDone = (await deps.readPickingStates(plan.toValidateIds)).some((picking) => picking.state === PICKING_STATE.DONE);

    if (result?.kind === 'done' || result?.kind === 'needsAnswer' || someDone) {
      await journal.step('batchValidate:notes', async () => null, () => deps.writeNotes(batchId, plan));
    }
    await deps.recomputeBatchState([batchId]);

    return result === null ? null : { kind: 'validated' as const, result };
  };

  // Batch Validate: validates the batch's transfers that have quantities and
  // lets the others leave the batch. A backorder or expired-lot question comes
  // back once for the whole batch; the pop-up calls again with the answer.
  // `printTimeZone`: the user's browser zone, for the dates on the prints Validate makes.
  const validateBatch = async (batchId: string, answer: BatchValidateAnswer, printTimeZone?: string): Promise<ValidateRouteResult> => {
    const outcome = await deps.withClaim(claimKey('batchValidate', batchId), (runId) => runBatchValidate(batchId, runId, answer, printTimeZone));

    if (outcome.kind === 'held') {
      throw new StockUserError(CLAIM_HELD_MESSAGE);
    }
    if (outcome.result === null) {
      throw new Error(`Batch Validate of ${batchId} ended without a result.`);
    }
    if (outcome.result.kind === 'refuse') {
      throw new StockUserError(outcome.result.message, outcome.result.values);
    }
    const result = outcome.result.result;

    // The reason comes filled in, in English, as the transfer Validate answers it.
    if (result.kind === 'refused') {
      throw new StockUserError(result.reason);
    }
    return result;
  };

  // The daily job (or a later click) finishes a stopped batch Validate.
  const resumeBatchValidate = async (batchId: string) => {
    await deps.withClaim(claimKey('batchValidate', batchId), (runId) => runBatchValidate(batchId, runId, null));
  };

  return { validateBatch, resumeBatchValidate };
};

export const { validateBatch, resumeBatchValidate } = makeBatchValidate({
  withClaim,
  openJournal,
  heldClaimKeys,
  planRun,
  validatePickings,
  resumeValidate,
  afterValidateBatch,
  readPickingStates: (pickingIds) => stockPickings.find<{ id: string; state: string }>({ id: { in: pickingIds } }, 'id state'),
  writeNotes,
  recomputeBatchState,
});
