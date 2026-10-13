import { RetryableLogicFunctionError } from 'twenty-sdk/logic-function';

import { isTransientError } from 'src/shared/utils/is-transient-error.util';
import { addRefreshRefusalTask, refreshReplenishmentSuggestions } from 'src/stock/orderpoint/refresh-replenishment-suggestions';

const readLocationIds = (value: unknown) =>
  Array.isArray(value) ? value.filter((id): id is string => typeof id === 'string' && id.length > 0) : undefined;

// A rerun finds the rows an earlier try made and adds only the missing ones,
// so the queue may run it again after a passing error, or while another
// refresh still holds the list. A refusal reaches staff as a task on the
// product, since no one waits for this run.
export const runRefreshJob = async (payload: { locationIds?: unknown; locale?: unknown }, deadlineAt: number) => {
  try {
    const result = await refreshReplenishmentSuggestions({
      deadlineAt,
      locationIds: readLocationIds(payload.locationIds),
      locale: typeof payload.locale === 'string' ? payload.locale : 'en',
    });

    if (result.kind === 'held') {
      throw new RetryableLogicFunctionError('Another replenishment refresh is running.');
    }
    if (result.kind === 'refused') {
      await addRefreshRefusalTask(result);
    }
    return result;
  } catch (error) {
    if (!(error instanceof RetryableLogicFunctionError) && isTransientError(error)) {
      throw new RetryableLogicFunctionError(error instanceof Error ? error.message : String(error));
    }
    throw error;
  }
};
