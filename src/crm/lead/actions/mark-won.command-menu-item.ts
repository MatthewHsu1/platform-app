import {
  defineCommandMenuItem,
  noneEquals,
  numberOfSelectedRecords,
  objectPermissions,
  selectedRecords,
} from 'twenty-sdk/define';

import { CRM_LEAD_OBJECT_UNIVERSAL_IDENTIFIER } from 'src/crm/crm-universal-identifiers.constant';
import {
  MARK_WON_COMMAND_MENU_ITEM_UNIVERSAL_IDENTIFIER,
  MARK_WON_FRONT_COMPONENT_UNIVERSAL_IDENTIFIER,
} from 'src/crm/lead/actions/lead-actions-universal-identifiers.constant';

// Only the selection and the user's rights decide whether the button shows: a lead's type and status may be
// hidden columns, which the condition cannot read. The logic function refuses a lead it cannot mark won.
export default defineCommandMenuItem({
  universalIdentifier: MARK_WON_COMMAND_MENU_ITEM_UNIVERSAL_IDENTIFIER,
  label: 'Mark won',
  shortLabel: 'Won',
  icon: 'IconTrophy',
  isPinned: true,
  availabilityType: 'RECORD_SELECTION',
  availabilityObjectUniversalIdentifier: CRM_LEAD_OBJECT_UNIVERSAL_IDENTIFIER,
  conditionalAvailabilityExpression:
    numberOfSelectedRecords === 1 &&
    objectPermissions.canUpdateObjectRecords &&
    noneEquals(selectedRecords, 'recordPermissions.canUpdate', false),
  frontComponentUniversalIdentifier: MARK_WON_FRONT_COMPONENT_UNIVERSAL_IDENTIFIER,
});
