import { defineCommandMenuItem, isSelectAll, noneEquals, numberOfSelectedRecords, selectedRecords } from 'twenty-sdk/define';

import { CRM_LEAD_OBJECT_UNIVERSAL_IDENTIFIER } from 'src/crm/crm-universal-identifiers.constant';
import { FIELDSERVICE_CRM_ACTION_UNIVERSAL_IDENTIFIERS } from 'src/fieldservice-crm/fieldservice-crm-universal-identifiers.constant';

// Hidden on a lead. The level the button needs is checked by the logic function: a condition cannot read it.
export default defineCommandMenuItem({
  universalIdentifier: FIELDSERVICE_CRM_ACTION_UNIVERSAL_IDENTIFIERS.createOrderCommandMenuItem,
  label: 'Create service order',
  shortLabel: 'Service order',
  icon: 'IconTruck',
  isPinned: false,
  availabilityType: 'RECORD_SELECTION',
  availabilityObjectUniversalIdentifier: CRM_LEAD_OBJECT_UNIVERSAL_IDENTIFIER,
  conditionalAvailabilityExpression: numberOfSelectedRecords === 1 && !isSelectAll && noneEquals(selectedRecords, 'leadType', 'LEAD'),
  frontComponentUniversalIdentifier: FIELDSERVICE_CRM_ACTION_UNIVERSAL_IDENTIFIERS.createOrderFrontComponent,
});
