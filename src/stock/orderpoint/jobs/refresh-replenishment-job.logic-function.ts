import { defineLogicFunction } from 'twenty-sdk/define';

import { runRefreshJob } from 'src/stock/orderpoint/run-refresh-job';
import { ORDERPOINT_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIERS } from 'src/stock/stock-universal-identifiers.constant';

const TIMEOUT_SECONDS = 900;

const handler = (payload: { locationIds?: unknown; locale?: unknown }) =>
  runRefreshJob(payload, Date.now() + (TIMEOUT_SECONDS - 60) * 1000);

export default defineLogicFunction({
  universalIdentifier: ORDERPOINT_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIERS.refreshJob,
  name: 'platform-stock-replenishment-refresh-job',
  description:
    'Goes on refreshing the replenishment suggestions in the background when one run of the Replenishment command could not finish them in time.',
  timeoutSeconds: TIMEOUT_SECONDS,
  handler,
});
