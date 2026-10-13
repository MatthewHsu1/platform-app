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
  CONVERT_LEADS_COMMAND_MENU_ITEM_UNIVERSAL_IDENTIFIER,
  CONVERT_LEADS_FRONT_COMPONENT_UNIVERSAL_IDENTIFIER,
} from 'src/crm/lead/actions/lead-actions-universal-identifiers.constant';

// No state check: lost and won leads in the selection are skipped by the
// conversion itself.
export default defineCommandMenuItem({
  universalIdentifier: CONVERT_LEADS_COMMAND_MENU_ITEM_UNIVERSAL_IDENTIFIER,
  label: 'Convert to opportunities',
  shortLabel: 'Convert',
  icon: 'IconTransform',
  isPinned: false,
  availabilityType: 'RECORD_SELECTION',
  availabilityObjectUniversalIdentifier: CRM_LEAD_OBJECT_UNIVERSAL_IDENTIFIER,
  conditionalAvailabilityExpression:
    numberOfSelectedRecords >= 2 &&
    !isSelectAll &&
    objectPermissions.canUpdateObjectRecords &&
    noneEquals(selectedRecords, 'recordPermissions.canUpdate', false),
  frontComponentUniversalIdentifier: CONVERT_LEADS_FRONT_COMPONENT_UNIVERSAL_IDENTIFIER,
});
