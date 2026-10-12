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
  MERGE_LEADS_COMMAND_MENU_ITEM_UNIVERSAL_IDENTIFIER,
  MERGE_LEADS_FRONT_COMPONENT_UNIVERSAL_IDENTIFIER,
} from 'src/crm/lead/actions/lead-actions-universal-identifiers.constant';

// A merge changes the kept lead; the merged-away leads go to the trash as part of it, so only the right to change
// leads is needed. The logic function checks the count and the leads again.
export default defineCommandMenuItem({
  universalIdentifier: MERGE_LEADS_COMMAND_MENU_ITEM_UNIVERSAL_IDENTIFIER,
  label: 'Merge leads',
  shortLabel: 'Merge',
  icon: 'IconArrowMerge',
  isPinned: false,
  availabilityType: 'RECORD_SELECTION',
  availabilityObjectUniversalIdentifier: CRM_LEAD_OBJECT_UNIVERSAL_IDENTIFIER,
  conditionalAvailabilityExpression:
    numberOfSelectedRecords >= 2 &&
    numberOfSelectedRecords <= 5 &&
    !isSelectAll &&
    objectPermissions.canUpdateObjectRecords &&
    noneEquals(selectedRecords, 'recordPermissions.canUpdate', false),
  frontComponentUniversalIdentifier: MERGE_LEADS_FRONT_COMPONENT_UNIVERSAL_IDENTIFIER,
});
