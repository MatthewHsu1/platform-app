import { type DatabaseEventBatchPayload, defineLogicFunction, type ObjectRecordEvent } from 'twenty-sdk/define';

import { readEvents } from 'src/shared/triggers/batch-events';
import { makeRunUtmTagTrigger } from 'src/utm/run-utm-triggers';
import { TWENTY_UTM_TRIGGER_API } from 'src/utm/twenty-utm-api';
import { UTM_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIERS } from 'src/utm/utm-universal-identifiers.constant';

const run = makeRunUtmTagTrigger(TWENTY_UTM_TRIGGER_API);

const handler = async (payload: DatabaseEventBatchPayload<ObjectRecordEvent<Record<string, unknown>>>) => {
  await run(readEvents(payload));

  return {};
};

export default defineLogicFunction({
  universalIdentifier: UTM_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIERS.utmTag,
  name: 'platform-utm-tag',
  description: 'Gives a new campaign tag a colour and removes the links of a deleted tag.',
  timeoutSeconds: 120,
  handler,
  databaseEventTriggerSettings: { eventName: 'utmTag.*', batchMode: true },
});
