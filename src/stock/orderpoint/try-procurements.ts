import { ProcurementFailure } from 'src/stock/procurement/apply-procurement-plan';
import { runClaimedProcurements } from 'src/stock/procurement/claimed-procurements';
import { checkProcurementBatch } from 'src/stock/procurement/run-procurements';
import { procurementClaimKey } from 'src/stock/orderpoint/orderpoint-claims';
import { type TryProcurementsResult } from 'src/stock/orderpoint/types/try-procurements-result.type';
import { type Procurement } from 'src/stock/utils/procurement/types/procurement.type';
import { type TranslatableText } from 'src/stock/utils/procurement/types/translatable-text.type';

// Runs the batch under the run's procurement claim. A batch that cannot be
// planned writes nothing and says which procurements fail on their own, each
// checked alone without writing, so the caller can drop those and try again.
export const tryProcurements = async (
  procurements: Procurement[],
  { runId, beforeCommit }: { runId: string; beforeCommit?: (claimRunId: string) => Promise<void> },
): Promise<TryProcurementsResult> => {
  let batchErrors: TranslatableText[];

  try {
    return { kind: 'done', moveIds: await runClaimedProcurements(procurementClaimKey(runId), procurements, { beforeCommit }) };
  } catch (error) {
    if (!(error instanceof ProcurementFailure)) {
      throw error;
    }
    batchErrors = error.errors;
  }
  const failures: { index: number; errors: TranslatableText[] }[] = [];

  for (const [index, procurement] of procurements.entries()) {
    try {
      await checkProcurementBatch([procurement]);
    } catch (error) {
      if (!(error instanceof ProcurementFailure)) {
        throw error;
      }
      failures.push({ index, errors: error.errors });
    }
  }

  return { kind: 'failed', errors: batchErrors, failures };
};
