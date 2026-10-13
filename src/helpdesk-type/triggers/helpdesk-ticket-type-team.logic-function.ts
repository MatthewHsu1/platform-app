import { defineLogicFunction } from 'twenty-sdk/define';

import { HELPDESK_TYPE_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIERS } from 'src/helpdesk-type/helpdesk-type-universal-identifiers.constant';
import { destroyDeletedLinksHandler } from 'src/shared/triggers/destroy-deleted-links';
import { records } from 'src/shared/triggers/records';

// A removed link row is destroyed, not trashed, so the same link can be made again.
export default defineLogicFunction({
  universalIdentifier: HELPDESK_TYPE_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIERS.typeTeam,
  name: 'platform-helpdesk-ticket-type-team',
  description: 'Removes a work case type team link for good once it is deleted, so the same link can be made again.',
  timeoutSeconds: 60,
  handler: destroyDeletedLinksHandler(records('helpdeskTicketTypeTeam', 'helpdeskTicketTypeTeams')),
  databaseEventTriggerSettings: { eventName: 'helpdeskTicketTypeTeam.*', batchMode: true },
});
