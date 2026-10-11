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
  MARK_LOST_COMMAND_MENU_ITEM_UNIVERSAL_IDENTIFIER,
  MARK_LOST_FRONT_COMPONENT_UNIVERSAL_IDENTIFIER,
} from 'src/crm/lead/actions/lead-actions-universal-identifiers.constant';

// Only the selection and the user's rights decide whether the button shows: a lead's status may be a hidden
// column, which the condition cannot read. Hidden in select-all mode, which hands the dialog no ids. The logic
// function refuses leads that are not pending.
export default defineCommandMenuItem({
  universalIdentifier: MARK_LOST_COMMAND_MENU_ITEM_UNIVERSAL_IDENTIFIER,
  label: 'Mark lost',
  shortLabel: 'Lost',
  icon: 'IconMoodSad',
  isPinned: true,
  availabilityType: 'RECORD_SELECTION',
  availabilityObjectUniversalIdentifier: CRM_LEAD_OBJECT_UNIVERSAL_IDENTIFIER,
  conditionalAvailabilityExpression:
    numberOfSelectedRecords >= 1 &&
    !isSelectAll &&
    objectPermissions.canUpdateObjectRecords &&
    noneEquals(selectedRecords, 'recordPermissions.canUpdate', false),
  frontComponentUniversalIdentifier: MARK_LOST_FRONT_COMPONENT_UNIVERSAL_IDENTIFIER,
});
