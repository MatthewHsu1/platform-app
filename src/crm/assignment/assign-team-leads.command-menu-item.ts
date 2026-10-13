import { defineCommandMenuItem, isSelectAll, numberOfSelectedRecords, objectPermissions } from 'twenty-sdk/define';

import { ASSIGNMENT_DOOR_UNIVERSAL_IDENTIFIERS } from 'src/crm/assignment/assignment-universal-identifiers.constant';
import { CRM_TEAM_OBJECT_UNIVERSAL_IDENTIFIER } from 'src/sales-team/sales-team-universal-identifiers.constant';

// Only the selection and the user's rights decide whether the button shows:
// whether the team uses leads or a pipeline may be a hidden column, which the
// condition cannot read. Only sales administrators may change teams, so the
// right hides the button from salespeople; the route refuses a team that uses
// neither, and checks the caller again.
export default defineCommandMenuItem({
  universalIdentifier: ASSIGNMENT_DOOR_UNIVERSAL_IDENTIFIERS.teamCommand,
  label: 'Assign leads',
  shortLabel: 'Assign',
  icon: 'IconUserPlus',
  isPinned: false,
  availabilityType: 'RECORD_SELECTION',
  availabilityObjectUniversalIdentifier: CRM_TEAM_OBJECT_UNIVERSAL_IDENTIFIER,
  conditionalAvailabilityExpression: numberOfSelectedRecords === 1 && !isSelectAll && objectPermissions.canUpdateObjectRecords,
  frontComponentUniversalIdentifier: ASSIGNMENT_DOOR_UNIVERSAL_IDENTIFIERS.teamFrontComponent,
});
