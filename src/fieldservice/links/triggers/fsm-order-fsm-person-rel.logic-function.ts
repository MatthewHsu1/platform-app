import { defineLogicFunction } from 'twenty-sdk/define';

import { fsmOrderFsmPersonRels } from 'src/fieldservice/fieldservice-records';
import { FIELDSERVICE_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIERS } from 'src/fieldservice/fieldservice-universal-identifiers.constant';
import { destroyDeletedLinksHandler } from 'src/shared/triggers/destroy-deleted-links';

export default defineLogicFunction({
  universalIdentifier: FIELDSERVICE_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIERS.fsmOrderFsmPersonRel,
  name: 'platform-fsm-order-fsm-person-rel',
  description: 'Removes a deleted order worker link for good, so the same link can be made again.',
  timeoutSeconds: 120,
  handler: destroyDeletedLinksHandler(fsmOrderFsmPersonRels),
  databaseEventTriggerSettings: { eventName: 'fsmOrderFsmPersonRel.*', batchMode: true },
});
