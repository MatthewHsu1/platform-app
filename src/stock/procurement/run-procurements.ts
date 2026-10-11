import { emptyProcurementWrites, procurementWrites, runPlannedProcurements } from 'src/stock/procurement/apply-procurement-plan';
import { DRY_RUN_PROCUREMENT_WRITE_API, PROCUREMENT_WRITE_API } from 'src/stock/procurement/procurement-write-api';
import { readProcurementContext } from 'src/stock/procurement/read-procurement-context';
import { readRoutingData } from 'src/stock/procurement/read-routing-data';
import { planProcurements } from 'src/stock/utils/procurement/plan-procurements.util';
import { withoutTakenStock } from 'src/stock/utils/procurement/without-taken-stock.util';
import { type ClaimJournal } from 'src/shared/claims/types/claim-journal.type';
import { type ProcurementWriteApi } from 'src/stock/procurement/types/procurement-write-api.type';
import { type Procurement } from 'src/stock/utils/procurement/types/procurement.type';
import { type ProcurementWritePlan } from 'src/stock/utils/procurement/types/procurement-write-plan.type';
import { type TakenStock } from 'src/stock/utils/procurement/types/taken-stock.type';

export const PROCUREMENT_STEP_PREFIX = 'procurement';

// Plans the whole tree of moves a set of procurements makes. Throws
// ProcurementFailure when a procurement cannot be planned. `stockTaken` is
// stock the caller will take out before the real run, counted as gone.
export const planProcurementBatch = async (
  procurements: Procurement[],
  runId: string,
  { stockTaken = [] }: { stockTaken?: TakenStock[] } = {},
): Promise<ProcurementWritePlan> => {
  if (procurements.length === 0) {
    return emptyProcurementWrites(runId);
  }
  const { data, products } = await readRoutingData([...new Set(procurements.map((procurement) => procurement.productId))]);
  const read = await readProcurementContext({
    runId,
    products,
    existingMoveIds: procurements.flatMap((procurement) =>
      (procurement.values.moveDests ?? []).flatMap((ref) => (ref.kind === 'existing' ? [ref.id] : [])),
    ),
    referenceIds: procurements.flatMap((procurement) => procurement.values.referenceIds ?? []),
  });
  const context = { ...read, quants: withoutTakenStock(read.quants, stockTaken) };

  return procurementWrites(planProcurements(procurements, data, context), data, context);
};

// Plans and keeps nothing: throws ProcurementFailure as the run would. For a
// caller that checks before its commit point and runs after it.
export const checkProcurementBatch = async (procurements: Procurement[], options: { stockTaken?: TakenStock[] } = {}) => {
  await planProcurementBatch(procurements, crypto.randomUUID(), options);
};

// Plans the whole tree, then writes it; nothing is written when a procurement
// cannot be planned. Under a journal the plan is stored first and a resumed run
// replays it.
export const runProcurementBatch = async (
  procurements: Procurement[],
  {
    journal,
    runId = journal?.runId ?? crypto.randomUUID(),
    api = PROCUREMENT_WRITE_API,
  }: { runId?: string; api?: ProcurementWriteApi; journal?: ClaimJournal } = {},
) => {
  // Under a journal the writing-nothing API would mark the write steps done, and the real run would then skip them.
  if (journal !== undefined && api === DRY_RUN_PROCUREMENT_WRITE_API) {
    throw new Error('A dry run takes no journal: check with checkProcurementBatch, then run under the journal.');
  }

  return runPlannedProcurements({
    plan: (id) => planProcurementBatch(procurements, id),
    runId,
    api,
    journal,
    stepPrefix: PROCUREMENT_STEP_PREFIX,
  });
};
