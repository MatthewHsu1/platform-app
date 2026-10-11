import { defineObject } from 'twenty-sdk/define';

import {
  CRM_LEAD_FIELD_UNIVERSAL_IDENTIFIERS,
  CRM_LEAD_OBJECT_UNIVERSAL_IDENTIFIER,
} from 'src/crm/crm-universal-identifiers.constant';
import { activeField, oneToManyField, seedKeyField } from 'src/shared/fields';
import {
  UTM_MEDIUM_FIELD_UNIVERSAL_IDENTIFIERS as FIELD_IDS,
  UTM_MEDIUM_OBJECT_UNIVERSAL_IDENTIFIER,
} from 'src/utm/utm-universal-identifiers.constant';

export default defineObject({
  universalIdentifier: UTM_MEDIUM_OBJECT_UNIVERSAL_IDENTIFIER,
  nameSingular: 'utmMedium',
  namePlural: 'utmMediums',
  labelSingular: 'Medium',
  labelPlural: 'Mediums',
  description: 'The channel a lead came through: website, phone, email, banner',
  icon: 'IconBroadcast',
  fields: [
    activeField(FIELD_IDS.active),
    oneToManyField({
      universalIdentifier: FIELD_IDS.crmLeads,
      name: 'crmLeads',
      label: 'Leads',
      icon: 'IconTarget',
      targetObjectUniversalIdentifier: CRM_LEAD_OBJECT_UNIVERSAL_IDENTIFIER,
      targetFieldUniversalIdentifier: CRM_LEAD_FIELD_UNIVERSAL_IDENTIFIERS.medium,
    }),
    seedKeyField(FIELD_IDS.seedKey),
  ],
});
