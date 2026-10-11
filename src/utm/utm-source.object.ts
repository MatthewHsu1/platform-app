import { defineObject } from 'twenty-sdk/define';

import {
  CRM_LEAD_FIELD_UNIVERSAL_IDENTIFIERS,
  CRM_LEAD_OBJECT_UNIVERSAL_IDENTIFIER,
} from 'src/crm/crm-universal-identifiers.constant';
import { activeField, oneToManyField, seedKeyField } from 'src/shared/fields';
import {
  UTM_SOURCE_FIELD_UNIVERSAL_IDENTIFIERS as FIELD_IDS,
  UTM_SOURCE_OBJECT_UNIVERSAL_IDENTIFIER,
} from 'src/utm/utm-universal-identifiers.constant';

export default defineObject({
  universalIdentifier: UTM_SOURCE_OBJECT_UNIVERSAL_IDENTIFIER,
  nameSingular: 'utmSource',
  namePlural: 'utmSources',
  labelSingular: 'Source',
  labelPlural: 'Sources',
  description: 'Where a lead comes from: a search engine, a newsletter, a referral',
  icon: 'IconSpeakerphone',
  fields: [
    activeField(FIELD_IDS.active),
    oneToManyField({
      universalIdentifier: FIELD_IDS.crmLeads,
      name: 'crmLeads',
      label: 'Leads',
      icon: 'IconTarget',
      targetObjectUniversalIdentifier: CRM_LEAD_OBJECT_UNIVERSAL_IDENTIFIER,
      targetFieldUniversalIdentifier: CRM_LEAD_FIELD_UNIVERSAL_IDENTIFIERS.source,
    }),
    seedKeyField(FIELD_IDS.seedKey),
  ],
});
