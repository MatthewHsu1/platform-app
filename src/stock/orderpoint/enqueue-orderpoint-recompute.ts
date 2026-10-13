import { enqueueJobs } from 'twenty-sdk/logic-function';

import { planRecomputeJobs } from 'src/stock/orderpoint/utils/plan-recompute-jobs.util';
import { ORDERPOINT_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIERS } from 'src/stock/stock-universal-identifiers.constant';

// Twenty grants an app at most 3 reruns of a job.
const RETRY_LIMIT = 3;

// Recomputes the rules in the background, a few seconds later.
export const enqueueOrderpointRecompute = async (orderpointIds: string[]) => {
  const { delayMs, calls } = planRecomputeJobs({ orderpointIds, now: new Date() });

  for (const jobs of calls) {
    await enqueueJobs({
      logicFunctionUniversalIdentifier: ORDERPOINT_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIERS.recomputeJob,
      jobs,
      delayMs,
      retryLimit: RETRY_LIMIT,
    });
  }
};
