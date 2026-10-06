import {
  defineCommandMenuItem,
  everyEquals,
  numberOfSelectedRecords,
  selectedRecords,
} from 'twenty-sdk/define';

import { CRM_LEAD_OBJECT_UNIVERSAL_IDENTIFIER } from 'src/crm/crm-universal-identifiers.constant';
import {
  RESTORE_LEAD_COMMAND_MENU_ITEM_UNIVERSAL_IDENTIFIER,
  RESTORE_LEAD_FRONT_COMPONENT_UNIVERSAL_IDENTIFIER,
} from 'src/crm/lead/actions/lead-actions-universal-identifiers.constant';

// Hiding the button is a convenience; the logic function checks again.
export default defineCommandMenuItem({
  universalIdentifier: RESTORE_LEAD_COMMAND_MENU_ITEM_UNIVERSAL_IDENTIFIER,
  label: 'Restore',
  shortLabel: 'Restore',
  icon: 'IconRestore',
  isPinned: true,
  availabilityType: 'RECORD_SELECTION',
  availabilityObjectUniversalIdentifier: CRM_LEAD_OBJECT_UNIVERSAL_IDENTIFIER,
  conditionalAvailabilityExpression:
    numberOfSelectedRecords === 1 && everyEquals(selectedRecords, 'wonStatus', 'LOST'),
  frontComponentUniversalIdentifier: RESTORE_LEAD_FRONT_COMPONENT_UNIVERSAL_IDENTIFIER,
});
