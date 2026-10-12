import { defineCommandMenuItem, isSelectAll, numberOfSelectedRecords } from 'twenty-sdk/define';

import { ASSIGNMENT_DOOR_UNIVERSAL_IDENTIFIERS } from 'src/crm/assignment/assignment-universal-identifiers.constant';
import { CRM_TEAM_OBJECT_UNIVERSAL_IDENTIFIER } from 'src/sales-team/sales-team-universal-identifiers.constant';

// Only the selection decides whether the button shows: whether the team uses
// leads or a pipeline may be a hidden column, which the condition cannot read.
// The route refuses a team that uses neither, and checks the caller again.
export default defineCommandMenuItem({
  universalIdentifier: ASSIGNMENT_DOOR_UNIVERSAL_IDENTIFIERS.teamCommand,
  label: 'Assign leads',
  shortLabel: 'Assign',
  icon: 'IconUserPlus',
  isPinned: false,
  availabilityType: 'RECORD_SELECTION',
  availabilityObjectUniversalIdentifier: CRM_TEAM_OBJECT_UNIVERSAL_IDENTIFIER,
  conditionalAvailabilityExpression: numberOfSelectedRecords === 1 && !isSelectAll,
  frontComponentUniversalIdentifier: ASSIGNMENT_DOOR_UNIVERSAL_IDENTIFIERS.teamFrontComponent,
});
