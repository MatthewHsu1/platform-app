import {
  defineCommandMenuItem,
  isSelectAll,
  noneEquals,
  numberOfSelectedRecords,
  objectPermissions,
  selectedRecords,
} from 'twenty-sdk/define';

import {
  DUPLICATE_CASES_COMMAND_MENU_ITEM_UNIVERSAL_IDENTIFIER,
  DUPLICATE_CASES_FRONT_COMPONENT_UNIVERSAL_IDENTIFIER,
} from 'src/helpdesk/actions/helpdesk-actions-universal-identifiers.constant';
import { HELPDESK_TICKET_OBJECT_UNIVERSAL_IDENTIFIER } from 'src/helpdesk/helpdesk-universal-identifiers.constant';

// Hidden in select-all mode, which hands the button no ids: tick the cases you want to copy.
export default defineCommandMenuItem({
  universalIdentifier: DUPLICATE_CASES_COMMAND_MENU_ITEM_UNIVERSAL_IDENTIFIER,
  label: 'Duplicate',
  shortLabel: 'Duplicate',
  icon: 'IconCopyPlus',
  isPinned: false,
  availabilityType: 'RECORD_SELECTION',
  availabilityObjectUniversalIdentifier: HELPDESK_TICKET_OBJECT_UNIVERSAL_IDENTIFIER,
  conditionalAvailabilityExpression:
    numberOfSelectedRecords >= 1 &&
    !isSelectAll &&
    objectPermissions.canUpdateObjectRecords &&
    noneEquals(selectedRecords, 'recordPermissions.canUpdate', false),
  frontComponentUniversalIdentifier: DUPLICATE_CASES_FRONT_COMPONENT_UNIVERSAL_IDENTIFIER,
});
