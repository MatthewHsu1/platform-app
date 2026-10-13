import { defineLogicFunction } from 'twenty-sdk/define';

import { HELPDESK_SLA_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIERS } from 'src/helpdesk-sla/helpdesk-sla-universal-identifiers.constant';
import { helpdeskSlaCategories } from 'src/helpdesk-sla/sla-records';
import { destroyDeletedLinksHandler } from 'src/shared/triggers/destroy-deleted-links';

// A removed link row is destroyed, not trashed, so the same link can be made again.
export default defineLogicFunction({
  universalIdentifier: HELPDESK_SLA_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIERS.slaCategory,
  name: 'platform-helpdesk-sla-category',
  description: 'Removes an SLA policy category link for good once it is deleted, so the same link can be made again.',
  timeoutSeconds: 60,
  handler: destroyDeletedLinksHandler(helpdeskSlaCategories),
  databaseEventTriggerSettings: { eventName: 'helpdeskSlaCategory.*', batchMode: true },
});
