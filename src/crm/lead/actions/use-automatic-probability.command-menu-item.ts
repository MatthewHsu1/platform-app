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
  USE_AUTOMATIC_PROBABILITY_COMMAND_MENU_ITEM_UNIVERSAL_IDENTIFIER,
  USE_AUTOMATIC_PROBABILITY_FRONT_COMPONENT_UNIVERSAL_IDENTIFIER,
} from 'src/crm/lead/actions/lead-actions-universal-identifiers.constant';

// Only the selection and the user's rights decide whether the button shows: the lead's status may be a hidden
// column, and a condition cannot compare the probability with the automatic one. The logic function refuses a
// lead that is not pending or already follows the automatic probability.
export default defineCommandMenuItem({
  universalIdentifier: USE_AUTOMATIC_PROBABILITY_COMMAND_MENU_ITEM_UNIVERSAL_IDENTIFIER,
  label: 'Use automatic probability',
  shortLabel: 'Automatic %',
  icon: 'IconRefresh',
  isPinned: false,
  availabilityType: 'RECORD_SELECTION',
  availabilityObjectUniversalIdentifier: CRM_LEAD_OBJECT_UNIVERSAL_IDENTIFIER,
  conditionalAvailabilityExpression:
    numberOfSelectedRecords === 1 &&
    !isSelectAll &&
    objectPermissions.canUpdateObjectRecords &&
    noneEquals(selectedRecords, 'recordPermissions.canUpdate', false),
  frontComponentUniversalIdentifier: USE_AUTOMATIC_PROBABILITY_FRONT_COMPONENT_UNIVERSAL_IDENTIFIER,
});
