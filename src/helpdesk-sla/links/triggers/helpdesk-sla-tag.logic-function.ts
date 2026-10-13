import { defineLogicFunction } from 'twenty-sdk/define';

import { HELPDESK_SLA_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIERS } from 'src/helpdesk-sla/helpdesk-sla-universal-identifiers.constant';
import { helpdeskSlaTags } from 'src/helpdesk-sla/sla-records';
import { destroyDeletedLinksHandler } from 'src/shared/triggers/destroy-deleted-links';

// A removed link row is destroyed, not trashed, so the same link can be made again.
export default defineLogicFunction({
  universalIdentifier: HELPDESK_SLA_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIERS.slaTag,
  name: 'platform-helpdesk-sla-tag',
  description: 'Removes an SLA policy tag link for good once it is deleted, so the same link can be made again.',
  timeoutSeconds: 60,
  handler: destroyDeletedLinksHandler(helpdeskSlaTags),
  databaseEventTriggerSettings: { eventName: 'helpdeskSlaTag.*', batchMode: true },
});
