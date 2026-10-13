import {
  defineCommandMenuItem,
  isSelectAll,
  noneEquals,
  numberOfSelectedRecords,
  objectPermissions,
  selectedRecords,
} from 'twenty-sdk/define';

import { CRM_LEAD_OBJECT_UNIVERSAL_IDENTIFIER } from 'src/crm/crm-universal-identifiers.constant';
import {
  RESTORE_LEAD_COMMAND_MENU_ITEM_UNIVERSAL_IDENTIFIER,
  RESTORE_LEAD_FRONT_COMPONENT_UNIVERSAL_IDENTIFIER,
} from 'src/crm/lead/actions/lead-actions-universal-identifiers.constant';

// Only the selection and the user's rights decide whether the button shows: the lead's status may be a hidden
// column, which the condition cannot read. The logic function refuses a lead that is not lost.
export default defineCommandMenuItem({
  universalIdentifier: RESTORE_LEAD_COMMAND_MENU_ITEM_UNIVERSAL_IDENTIFIER,
  label: 'Restore',
  shortLabel: 'Restore',
  icon: 'IconRestore',
  isPinned: true,
  availabilityType: 'RECORD_SELECTION',
  availabilityObjectUniversalIdentifier: CRM_LEAD_OBJECT_UNIVERSAL_IDENTIFIER,
  conditionalAvailabilityExpression:
    numberOfSelectedRecords === 1 &&
    !isSelectAll &&
    objectPermissions.canUpdateObjectRecords &&
    noneEquals(selectedRecords, 'recordPermissions.canUpdate', false),
  frontComponentUniversalIdentifier: RESTORE_LEAD_FRONT_COMPONENT_UNIVERSAL_IDENTIFIER,
});
