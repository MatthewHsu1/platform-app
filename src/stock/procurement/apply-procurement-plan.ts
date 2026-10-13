import { prefixedJournal } from 'src/shared/claims/prefixed-journal';
import { translate } from 'src/shared/i18n/translate';
import { planProcurementWrites } from 'src/stock/utils/procurement/plan-procurement-writes.util';
import { type ClaimJournal } from 'src/shared/claims/types/claim-journal.type';
import { type ProcurementWriteApi } from 'src/stock/procurement/types/procurement-write-api.type';
import { type PlanProcurementsResult } from 'src/stock/utils/procurement/types/plan-procurements-result.type';
import { type ProcurementContext } from 'src/stock/utils/procurement/types/procurement-context.type';
import { type ProcurementWritePlan } from 'src/stock/utils/procurement/types/procurement-write-plan.type';
import { type RoutingData } from 'src/stock/utils/procurement/types/routing-data.type';
import { type TranslatableText } from 'src/stock/utils/procurement/types/translatable-text.type';

// The joined error text of a plan that cannot run; nothing was written.
export class ProcurementFailure extends Error {
  constructor(readonly errors: TranslatableText[]) {
    super(errors.map((error) => translate('en', error.message, error.values)).join('\n'));
    this.name = 'ProcurementFailure';
  }
}

export const emptyProcurementWrites = (runId: string): ProcurementWritePlan => ({
  runId,
  moves: [],
  moveLinks: [],
  routeLinks: [],
  referenceLinks: [],
  partnerUpdates: [],
});

// The rows of a plan that holds; a plan with errors refuses the whole run.
export const procurementWrites = (plan: PlanProcurementsResult, data: RoutingData, context: ProcurementContext) => {
  if (plan.errors.length > 0) {
    throw new ProcurementFailure(plan.errors);
  }

  return planProcurementWrites(plan, data, context, () => crypto.randomUUID());
};

type PlanRun = (runId: string) => Promise<ProcurementWritePlan>;

type StoreOptions = { runId: string; journal?: ClaimJournal; stepPrefix: string };

const isEmptyProcurementPlan = (writes: ProcurementWritePlan) =>
  writes.moves.length === 0 && writes.partnerUpdates.length === 0;

// Under a journal the plan is stored once, even one with nothing to do: a check
// before the caller's commit point and the real run after it write the same
// plan, and a resumed run replays it instead of planning again. A plan that
// fails stores nothing.
export const storeProcurementPlan = async (plan: PlanRun, { runId, journal, stepPrefix }: StoreOptions) =>
  journal === undefined ? plan(runId) : journal.step(`${stepPrefix}:plan`, () => plan(runId), async () => {});

// Creates the moves, then their links and partners, then confirms the moves
// named. The rows are built only while the write step is still to run, so a
// rerun past it needs nothing it could no longer read back. Every write is safe
// to repeat: rows are created only when their planned id is not there yet, and
// the confirm finishes what a stopped confirm began.
export const writeProcurementRows = async (
  moveIds: string[],
  rows: () => Promise<ProcurementWritePlan>,
  api: ProcurementWriteApi,
  { journal, stepPrefix }: { journal?: ClaimJournal; stepPrefix: string },
) => {
  const runStep = async (name: string, work: () => Promise<void>) => {
    if (journal === undefined) {
      await work();
    } else {
      await journal.step(`${stepPrefix}:${name}`, async () => true, work);
    }
  };

  await runStep('write', async () => {
    const writes = await rows();

    await api.createMoves(writes.moves);
    await api.linkMoves(writes.moveLinks);
    await api.linkRoutes(writes.routeLinks);
    await api.linkReferences(writes.referenceLinks);
    for (const update of writes.partnerUpdates) {
      await api.setPartner(update.moveId, update.companyId);
    }
  });
  if (moveIds.length > 0) {
    await runStep('confirm', () =>
      api.confirm(moveIds, journal === undefined ? undefined : prefixedJournal(journal, `${stepPrefix}:confirm`)),
    );
  }

  return moveIds;
};

export const writeProcurementPlan = async (
  writes: ProcurementWritePlan,
  api: ProcurementWriteApi,
  options: { journal?: ClaimJournal; stepPrefix: string },
) =>
  isEmptyProcurementPlan(writes)
    ? []
    : writeProcurementRows(
        writes.moves.map((move) => move.id),
        async () => writes,
        api,
        options,
      );

// Plans (or replays the stored plan), passes the commit point, then writes.
export const runPlannedProcurements = async ({
  plan,
  runId,
  api,
  journal,
  stepPrefix,
  onCommit,
}: StoreOptions & { plan: PlanRun; api: ProcurementWriteApi; onCommit?: () => Promise<void> }) => {
  const writes = await storeProcurementPlan(plan, { runId, journal, stepPrefix });

  await onCommit?.();

  return writeProcurementPlan(writes, api, { journal, stepPrefix });
};
