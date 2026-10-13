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
  CONVERT_LEAD_COMMAND_MENU_ITEM_UNIVERSAL_IDENTIFIER,
  CONVERT_LEAD_FRONT_COMPONENT_UNIVERSAL_IDENTIFIER,
} from 'src/crm/lead/actions/lead-actions-universal-identifiers.constant';

// The lead's type and status may be hidden columns of the view, where the
// condition cannot read them; the logic function refuses a lead that cannot
// be converted.
export default defineCommandMenuItem({
  universalIdentifier: CONVERT_LEAD_COMMAND_MENU_ITEM_UNIVERSAL_IDENTIFIER,
  label: 'Convert to opportunity',
  shortLabel: 'Convert',
  icon: 'IconTransform',
  isPinned: true,
  availabilityType: 'RECORD_SELECTION',
  availabilityObjectUniversalIdentifier: CRM_LEAD_OBJECT_UNIVERSAL_IDENTIFIER,
  conditionalAvailabilityExpression:
    numberOfSelectedRecords === 1 &&
    !isSelectAll &&
    objectPermissions.canUpdateObjectRecords &&
    noneEquals(selectedRecords, 'recordPermissions.canUpdate', false),
  frontComponentUniversalIdentifier: CONVERT_LEAD_FRONT_COMPONENT_UNIVERSAL_IDENTIFIER,
});
