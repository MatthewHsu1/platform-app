import {
  defineCommandMenuItem,
  isSelectAll,
  noneEquals,
  numberOfSelectedRecords,
  objectPermissions,
  selectedRecords,
} from 'twenty-sdk/define';

import {
  ASSIGN_TO_ME_COMMAND_MENU_ITEM_UNIVERSAL_IDENTIFIER,
  ASSIGN_TO_ME_FRONT_COMPONENT_UNIVERSAL_IDENTIFIER,
} from 'src/helpdesk/actions/helpdesk-actions-universal-identifiers.constant';
import { HELPDESK_TICKET_OBJECT_UNIVERSAL_IDENTIFIER } from 'src/helpdesk/helpdesk-universal-identifiers.constant';

// Only the selection and the user's rights decide whether the button shows: the assignee and the team may be
// hidden columns, which the condition cannot read. The logic function checks the team again.
export default defineCommandMenuItem({
  universalIdentifier: ASSIGN_TO_ME_COMMAND_MENU_ITEM_UNIVERSAL_IDENTIFIER,
  label: 'Assign to me',
  shortLabel: 'Assign to me',
  icon: 'IconUserCheck',
  isPinned: true,
  availabilityType: 'RECORD_SELECTION',
  availabilityObjectUniversalIdentifier: HELPDESK_TICKET_OBJECT_UNIVERSAL_IDENTIFIER,
  conditionalAvailabilityExpression:
    numberOfSelectedRecords === 1 &&
    !isSelectAll &&
    objectPermissions.canUpdateObjectRecords &&
    noneEquals(selectedRecords, 'recordPermissions.canUpdate', false),
  frontComponentUniversalIdentifier: ASSIGN_TO_ME_FRONT_COMPONENT_UNIVERSAL_IDENTIFIER,
});
