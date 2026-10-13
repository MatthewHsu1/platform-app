import { defineLogicFunction } from 'twenty-sdk/define';

import { CRM_ROTTING_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIER } from 'src/crm/crm-universal-identifiers.constant';
import { recomputeRotting } from 'src/crm/lead/recompute-rotting';

const handler = async () => ({ updated: await recomputeRotting(null) });

// At 01:00 UTC, an hour after the stock daily job starts, so the two long runs do not overlap.
export default defineLogicFunction({
  universalIdentifier: CRM_ROTTING_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIER,
  name: 'refresh-lead-rotting',
  description: 'Flags open opportunities that stayed in their stage too long, every day at 01:00 UTC.',
  timeoutSeconds: 900,
  handler,
  cronTriggerSettings: { pattern: '0 1 * * *' },
});
