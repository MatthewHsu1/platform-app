import { defineLogicFunction } from 'twenty-sdk/define';

import { DAILY_JOB_TIMEOUT_SECONDS } from 'src/stock/scheduler/daily-job-limits.constant';
import { runDailyJob } from 'src/stock/scheduler/run-daily-job';
import { STOCK_DAILY_JOB_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIER } from 'src/stock/stock-universal-identifiers.constant';

// Every step runs first; the failures then fail the run, so they show in the function's logs. A plain
// error is not retried, so the job does not run twice.
const handler = async () => {
  const result = await runDailyJob();

  if (result.failures.length > 0) {
    throw new Error(`Daily stock job: ${result.failures.join(' | ')}`);
  }

  return result;
};

// Once a day at 00:00 UTC; 900 s is Twenty's longest logic-function run, and the ledger recheck waits 120 s of it.
export default defineLogicFunction({
  universalIdentifier: STOCK_DAILY_JOB_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIER,
  name: 'platform-stock-daily-job',
  description:
    'Once a day: recomputes reordering rules and orders for the automatic ones, reserves waiting moves whose day has come, recomputes reserved stock, removes empty stock rows, checks stock levels against the done move lines, resumes stale runs, rebuilds the mixed roles and the row rules, and goes on trimming the columns of the "All" lists until every list is done.',
  timeoutSeconds: DAILY_JOB_TIMEOUT_SECONDS,
  handler,
  cronTriggerSettings: { pattern: '0 0 * * *' },
});
