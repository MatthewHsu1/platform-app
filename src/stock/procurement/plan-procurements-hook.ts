import { runPlannedProcurements, storeProcurementPlan } from 'src/stock/procurement/apply-procurement-plan';
import { PROCUREMENT_WRITE_API } from 'src/stock/procurement/procurement-write-api';
import { checkProcurementBatch, planProcurementBatch, PROCUREMENT_STEP_PREFIX } from 'src/stock/procurement/run-procurements';
import { companiesForRouting } from 'src/stock/routing-records';
import { procurementOfRequest, requestPartnerIds } from 'src/stock/utils/procurement/procurement-of-request.util';
import { type ClaimJournal } from 'src/shared/claims/types/claim-journal.type';
import { type ProcurementRequest } from 'src/stock/procurement/types/procurement-request.type';
import { type PartnerRef } from 'src/stock/utils/procurement/types/partner-ref.type';
import { type Procurement } from 'src/stock/utils/procurement/types/procurement.type';
import { type TakenStock } from 'src/stock/utils/procurement/types/taken-stock.type';

// The request's partner is one id, a person's or else a company's.
const readPartners = async (partnerIds: string[]): Promise<Map<string, PartnerRef>> => {
  const companyIds =
    partnerIds.length === 0
      ? new Set<string>()
      : new Set((await companiesForRouting.find<{ id: string }>({ id: { in: partnerIds } }, 'id')).map((row) => row.id));

  return new Map(
    partnerIds.map((id) => [id, companyIds.has(id) ? { companyId: id, personId: null } : { companyId: null, personId: id }]),
  );
};

const toProcurements = async (requests: ProcurementRequest[]): Promise<Procurement[]> => {
  const partners = await readPartners(requestPartnerIds(requests));

  return requests.map((request) => procurementOfRequest(request, partners));
};

// Runs procurements through the rules: plans the whole tree, then writes it.
// Throws ProcurementFailure, writing nothing, when a procurement has no rule.
// Under a journal the plan is stored first, so a resumed run replays it.
export const runProcurements = async (
  requests: ProcurementRequest[],
  { journal }: { journal?: ClaimJournal } = {},
): Promise<void> => {
  if (requests.length === 0) {
    return;
  }
  await runPlannedProcurements({
    plan: async (runId) => planProcurementBatch(await toProcurements(requests), runId),
    runId: journal?.runId ?? crypto.randomUUID(),
    api: PROCUREMENT_WRITE_API,
    journal,
    stepPrefix: PROCUREMENT_STEP_PREFIX,
  });
};

// Plans the procurements and writes nothing; throws ProcurementFailure as
// runProcurements would. Under a journal the plan is stored and the real run
// writes it; without one the plan is thrown away and the real run plans again
// (stock the caller takes out first is counted as gone here).
export const checkProcurements = async (
  requests: ProcurementRequest[],
  { journal, stockTaken }: { journal?: ClaimJournal; stockTaken?: TakenStock[] } = {},
): Promise<void> => {
  if (requests.length === 0) {
    return;
  }
  if (journal === undefined) {
    await checkProcurementBatch(await toProcurements(requests), { stockTaken });
    return;
  }
  await storeProcurementPlan(async (runId) => planProcurementBatch(await toProcurements(requests), runId, { stockTaken }), {
    runId: journal.runId,
    journal,
    stepPrefix: PROCUREMENT_STEP_PREFIX,
  });
};
