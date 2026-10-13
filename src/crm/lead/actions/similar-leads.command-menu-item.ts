import { defineCommandMenuItem, isSelectAll, numberOfSelectedRecords } from 'twenty-sdk/define';

import { CRM_LEAD_OBJECT_UNIVERSAL_IDENTIFIER } from 'src/crm/crm-universal-identifiers.constant';
import {
  SIMILAR_LEADS_COMMAND_MENU_ITEM_UNIVERSAL_IDENTIFIER,
  SIMILAR_LEADS_FRONT_COMPONENT_UNIVERSAL_IDENTIFIER,
} from 'src/crm/lead/actions/lead-actions-universal-identifiers.constant';

export default defineCommandMenuItem({
  universalIdentifier: SIMILAR_LEADS_COMMAND_MENU_ITEM_UNIVERSAL_IDENTIFIER,
  label: 'Similar leads',
  shortLabel: 'Similar',
  icon: 'IconCopy',
  isPinned: false,
  availabilityType: 'RECORD_SELECTION',
  availabilityObjectUniversalIdentifier: CRM_LEAD_OBJECT_UNIVERSAL_IDENTIFIER,
  conditionalAvailabilityExpression: numberOfSelectedRecords === 1 && !isSelectAll,
  frontComponentUniversalIdentifier: SIMILAR_LEADS_FRONT_COMPONENT_UNIVERSAL_IDENTIFIER,
});
