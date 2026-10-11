import { type DatabaseEventBatchPayload, defineLogicFunction, type ObjectRecordEvent } from 'twenty-sdk/define';

import { readEvents } from 'src/shared/triggers/batch-events';
import { makeRunCampaignTrigger } from 'src/utm/run-utm-triggers';
import { TWENTY_UTM_TRIGGER_API } from 'src/utm/twenty-utm-api';
import { UTM_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIERS } from 'src/utm/utm-universal-identifiers.constant';

const run = makeRunCampaignTrigger(TWENTY_UTM_TRIGGER_API);

const handler = async (payload: DatabaseEventBatchPayload<ObjectRecordEvent<Record<string, unknown>>>) => {
  await run(readEvents(payload));

  return {};
};

export default defineLogicFunction({
  universalIdentifier: UTM_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIERS.utmCampaign,
  name: 'platform-utm-campaign',
  description: 'Fills a new campaign, keeps campaign names unique, and clears a deleted campaign from leads and tags.',
  timeoutSeconds: 120,
  handler,
  databaseEventTriggerSettings: { eventName: 'utmCampaign.*', batchMode: true },
});
