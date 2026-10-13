import { defineLogicFunction } from 'twenty-sdk/define';

import { HELPDESK_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIERS } from 'src/helpdesk/helpdesk-universal-identifiers.constant';
import { destroyDeletedLinksHandler } from 'src/shared/triggers/destroy-deleted-links';
import { records } from 'src/shared/triggers/records';

// A removed link row is destroyed, not trashed, so the same link can be made again.
export default defineLogicFunction({
  universalIdentifier: HELPDESK_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIERS.helpdeskTicketTeamCategory,
  name: 'platform-helpdesk-ticket-team-category',
  description: 'Removes a work case team category link for good once it is deleted, so the same link can be made again.',
  timeoutSeconds: 60,
  handler: destroyDeletedLinksHandler(records('helpdeskTicketTeamCategory', 'helpdeskTicketTeamCategories')),
  databaseEventTriggerSettings: { eventName: 'helpdeskTicketTeamCategory.*', batchMode: true },
});
