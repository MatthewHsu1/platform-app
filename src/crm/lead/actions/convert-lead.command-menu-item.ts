import {
  defineCommandMenuItem,
  everyEquals,
  numberOfSelectedRecords,
  selectedRecords,
} from 'twenty-sdk/define';

import { CRM_LEAD_OBJECT_UNIVERSAL_IDENTIFIER } from 'src/crm/crm-universal-identifiers.constant';
import {
  CONVERT_LEAD_COMMAND_MENU_ITEM_UNIVERSAL_IDENTIFIER,
  CONVERT_LEAD_FRONT_COMPONENT_UNIVERSAL_IDENTIFIER,
} from 'src/crm/lead/actions/lead-actions-universal-identifiers.constant';

// Hiding the button is a convenience; the logic function checks again.
export default defineCommandMenuItem({
  universalIdentifier: CONVERT_LEAD_COMMAND_MENU_ITEM_UNIVERSAL_IDENTIFIER,
  label: 'Convert to opportunity',
  shortLabel: 'Convert',
  icon: 'IconTransform',
  isPinned: true,
  availabilityType: 'RECORD_SELECTION',
  availabilityObjectUniversalIdentifier: CRM_LEAD_OBJECT_UNIVERSAL_IDENTIFIER,
  conditionalAvailabilityExpression:
    numberOfSelectedRecords === 1 && everyEquals(selectedRecords, 'leadType', 'LEAD') && everyEquals(selectedRecords, 'wonStatus', 'PENDING'),
  frontComponentUniversalIdentifier: CONVERT_LEAD_FRONT_COMPONENT_UNIVERSAL_IDENTIFIER,
});
