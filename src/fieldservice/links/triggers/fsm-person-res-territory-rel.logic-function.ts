import { defineLogicFunction } from 'twenty-sdk/define';

import { fsmPersonResTerritoryRels } from 'src/fieldservice/fieldservice-records';
import { FIELDSERVICE_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIERS } from 'src/fieldservice/fieldservice-universal-identifiers.constant';
import { destroyDeletedLinksHandler } from 'src/shared/triggers/destroy-deleted-links';

export default defineLogicFunction({
  universalIdentifier: FIELDSERVICE_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIERS.fsmPersonResTerritoryRel,
  name: 'platform-fsm-person-res-territory-rel',
  description: 'Removes a deleted worker territory link for good, so the same link can be made again.',
  timeoutSeconds: 120,
  handler: destroyDeletedLinksHandler(fsmPersonResTerritoryRels),
  databaseEventTriggerSettings: { eventName: 'fsmPersonResTerritoryRel.*', batchMode: true },
});
