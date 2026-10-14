import { defineField, OnDeleteAction } from 'twenty-sdk/define';

import { CRM_LEAD_OBJECT_UNIVERSAL_IDENTIFIER } from 'src/crm/crm-universal-identifiers.constant';
import { FSM_ORDER_OBJECT_UNIVERSAL_IDENTIFIER } from 'src/fieldservice/fieldservice-universal-identifiers.constant';
import { FIELDSERVICE_CRM_FIELD_UNIVERSAL_IDENTIFIERS as FIELD_IDS } from 'src/fieldservice-crm/fieldservice-crm-universal-identifiers.constant';
import { manyToOneField } from 'src/shared/fields';

export default defineField({
  ...manyToOneField({
    universalIdentifier: FIELD_IDS.fsmOrderOpportunity,
    name: 'opportunity',
    label: 'Opportunity',
    icon: 'IconTargetArrow',
    onDelete: OnDeleteAction.SET_NULL,
    targetObjectUniversalIdentifier: CRM_LEAD_OBJECT_UNIVERSAL_IDENTIFIER,
    targetFieldUniversalIdentifier: FIELD_IDS.crmLeadFsmOrders,
  }),
  objectUniversalIdentifier: FSM_ORDER_OBJECT_UNIVERSAL_IDENTIFIER,
});
