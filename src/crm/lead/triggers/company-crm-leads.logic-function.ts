import { type DatabaseEventBatchPayload, defineLogicFunction, type ObjectRecordEvent } from 'twenty-sdk/define';

import { makeRunCompanyTrigger } from 'src/crm/lead/run-partner-triggers';
import { TWENTY_PARTNER_TRIGGER_API } from 'src/crm/lead/twenty-partner-api';
import { SALES_TEAM_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIERS } from 'src/sales-team/sales-team-universal-identifiers.constant';
import { readEvents } from 'src/shared/triggers/batch-events';

const runCompanyTrigger = makeRunCompanyTrigger(TWENTY_PARTNER_TRIGGER_API);

const handler = async (payload: DatabaseEventBatchPayload<ObjectRecordEvent<Record<string, unknown>>>) => {
  await runCompanyTrigger(readEvents(payload));

  return {};
};

export default defineLogicFunction({
  universalIdentifier: SALES_TEAM_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIERS.company,
  name: 'platform-company-crm-leads',
  description: 'Clears a deleted company from its leads.',
  timeoutSeconds: 120,
  handler,
  databaseEventTriggerSettings: { eventName: 'company.*', batchMode: true },
});
