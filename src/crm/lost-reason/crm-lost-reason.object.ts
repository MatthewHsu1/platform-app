import { defineObject } from 'twenty-sdk/define';

import {
  CRM_LEAD_FIELD_UNIVERSAL_IDENTIFIERS,
  CRM_LEAD_OBJECT_UNIVERSAL_IDENTIFIER,
  CRM_LOST_REASON_FIELD_UNIVERSAL_IDENTIFIERS as FIELD_IDS,
  CRM_LOST_REASON_OBJECT_UNIVERSAL_IDENTIFIER,
} from 'src/crm/crm-universal-identifiers.constant';
import { activeField, oneToManyField } from 'src/shared/fields';

export default defineObject({
  universalIdentifier: CRM_LOST_REASON_OBJECT_UNIVERSAL_IDENTIFIER,
  nameSingular: 'crmLostReason',
  namePlural: 'crmLostReasons',
  labelSingular: 'Lost reason',
  labelPlural: 'Lost reasons',
  description: 'Why a lead was lost',
  icon: 'IconMoodSad',
  fields: [
    activeField(FIELD_IDS.active),
    oneToManyField({
      universalIdentifier: FIELD_IDS.crmLeads,
      name: 'crmLeads',
      label: 'Leads',
      icon: 'IconTarget',
      targetObjectUniversalIdentifier: CRM_LEAD_OBJECT_UNIVERSAL_IDENTIFIER,
      targetFieldUniversalIdentifier: CRM_LEAD_FIELD_UNIVERSAL_IDENTIFIERS.lostReason,
    }),
  ],
});
