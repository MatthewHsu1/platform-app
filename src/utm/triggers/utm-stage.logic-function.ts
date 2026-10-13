import { type DatabaseEventBatchPayload, defineLogicFunction, type ObjectRecordEvent } from 'twenty-sdk/define';

import { readEvents } from 'src/shared/triggers/batch-events';
import { makeRunUtmStageTrigger } from 'src/utm/run-utm-triggers';
import { TWENTY_UTM_TRIGGER_API } from 'src/utm/twenty-utm-api';
import { UTM_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIERS } from 'src/utm/utm-universal-identifiers.constant';

const run = makeRunUtmStageTrigger(TWENTY_UTM_TRIGGER_API);

const handler = async (payload: DatabaseEventBatchPayload<ObjectRecordEvent<Record<string, unknown>>>) => {
  await run(readEvents(payload));

  return {};
};

export default defineLogicFunction({
  universalIdentifier: UTM_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIERS.utmStage,
  name: 'platform-utm-stage',
  description: 'Keeps a campaign stage that campaigns are in.',
  timeoutSeconds: 120,
  handler,
  databaseEventTriggerSettings: { eventName: 'utmStage.*', batchMode: true },
});
