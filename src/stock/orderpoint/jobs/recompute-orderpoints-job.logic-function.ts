import { defineLogicFunction } from 'twenty-sdk/define';
import { RetryableLogicFunctionError } from 'twenty-sdk/logic-function';

import { isTransientError } from 'src/shared/utils/is-transient-error.util';
import { recomputeOrderpoint } from 'src/stock/orderpoint/recompute-orderpoint';
import { addReplenishmentIssueTasks } from 'src/stock/orderpoint/replenishment-issue-tasks';
import { ORDERPOINT_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIERS } from 'src/stock/stock-universal-identifiers.constant';

// A run writes only values that differ and makes its tasks with fixed ids, so
// the queue may run it again after a passing error.
const handler = async (payload: { orderpointIds?: string[] }) => {
  const orderpointIds = payload.orderpointIds ?? [];

  try {
    const { failures } = await recomputeOrderpoint(orderpointIds);

    await addReplenishmentIssueTasks(failures);
  } catch (error) {
    if (isTransientError(error)) {
      throw new RetryableLogicFunctionError(error instanceof Error ? error.message : String(error));
    }
    throw error;
  }
  return { recomputed: orderpointIds.length };
};

export default defineLogicFunction({
  universalIdentifier: ORDERPOINT_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIERS.recomputeJob,
  name: 'platform-stock-orderpoint-recompute-job',
  description:
    'Recomputes the quantities and dates of a batch of reordering rules in the background, after their moves, products, rules or routes change.',
  timeoutSeconds: 900,
  handler,
});
