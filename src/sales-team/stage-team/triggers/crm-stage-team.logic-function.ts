import { defineLogicFunction } from 'twenty-sdk/define';

import { SALES_TEAM_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIERS } from 'src/sales-team/sales-team-universal-identifiers.constant';
import { destroyDeletedLinksHandler } from 'src/shared/triggers/destroy-deleted-links';
import { records } from 'src/shared/triggers/records';

// Adding or removing a link changes no lead: a lead's stage is checked
// against its team again on its next team or type change.
export default defineLogicFunction({
  universalIdentifier: SALES_TEAM_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIERS.crmStageTeam,
  name: 'platform-crm-stage-team',
  description: 'Removes a stage team link for good once it is deleted, so the same link can be made again.',
  timeoutSeconds: 60,
  handler: destroyDeletedLinksHandler(records('crmStageTeam', 'crmStageTeams')),
  databaseEventTriggerSettings: { eventName: 'crmStageTeam.*', batchMode: true },
});
