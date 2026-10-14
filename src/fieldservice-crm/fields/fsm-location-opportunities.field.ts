import { defineField } from 'twenty-sdk/define';

import { CRM_LEAD_OBJECT_UNIVERSAL_IDENTIFIER } from 'src/crm/crm-universal-identifiers.constant';
import { FSM_LOCATION_OBJECT_UNIVERSAL_IDENTIFIER } from 'src/fieldservice/fieldservice-universal-identifiers.constant';
import { FIELDSERVICE_CRM_FIELD_UNIVERSAL_IDENTIFIERS as FIELD_IDS } from 'src/fieldservice-crm/fieldservice-crm-universal-identifiers.constant';
import { oneToManyField } from 'src/shared/fields';

export default defineField({
  ...oneToManyField({
    universalIdentifier: FIELD_IDS.fsmLocationOpportunities,
    name: 'opportunities',
    label: 'Opportunities',
    icon: 'IconTargetArrow',
    targetObjectUniversalIdentifier: CRM_LEAD_OBJECT_UNIVERSAL_IDENTIFIER,
    targetFieldUniversalIdentifier: FIELD_IDS.crmLeadFsmLocation,
  }),
  objectUniversalIdentifier: FSM_LOCATION_OBJECT_UNIVERSAL_IDENTIFIER,
});
