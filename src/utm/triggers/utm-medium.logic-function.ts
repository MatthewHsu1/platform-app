import { type DatabaseEventBatchPayload, defineLogicFunction, type ObjectRecordEvent } from 'twenty-sdk/define';

import { readEvents } from 'src/shared/triggers/batch-events';
import { makeRunUtmNameTrigger } from 'src/utm/run-utm-triggers';
import { MEDIUM_NAME_RULES } from 'src/utm/utm-name-rules';
import { TWENTY_UTM_TRIGGER_API } from 'src/utm/twenty-utm-api';
import { UTM_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIERS } from 'src/utm/utm-universal-identifiers.constant';

const run = makeRunUtmNameTrigger(MEDIUM_NAME_RULES, TWENTY_UTM_TRIGGER_API);

const handler = async (payload: DatabaseEventBatchPayload<ObjectRecordEvent<Record<string, unknown>>>) => {
  await run(readEvents(payload));

  return {};
};

export default defineLogicFunction({
  universalIdentifier: UTM_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIERS.utmMedium,
  name: 'platform-utm-medium',
  description: 'Keeps medium names unique, keeps the mediums other parts rely on, and clears a deleted medium from leads.',
  timeoutSeconds: 120,
  handler,
  databaseEventTriggerSettings: { eventName: 'utmMedium.*', batchMode: true },
});
