import { defineLogicFunction } from 'twenty-sdk/define';

import { fsmLocationPersons } from 'src/fieldservice/fieldservice-records';
import { FIELDSERVICE_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIERS } from 'src/fieldservice/fieldservice-universal-identifiers.constant';
import { destroyDeletedLinksHandler } from 'src/shared/triggers/destroy-deleted-links';

export default defineLogicFunction({
  universalIdentifier: FIELDSERVICE_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIERS.fsmLocationPerson,
  name: 'platform-fsm-location-person',
  description: 'Removes a deleted location worker link for good, so the same link can be made again.',
  timeoutSeconds: 120,
  handler: destroyDeletedLinksHandler(fsmLocationPersons),
  databaseEventTriggerSettings: { eventName: 'fsmLocationPerson.*', batchMode: true },
});
