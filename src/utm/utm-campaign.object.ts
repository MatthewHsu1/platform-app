import { defineObject } from 'twenty-sdk/define';

import {
  CRM_LEAD_FIELD_UNIVERSAL_IDENTIFIERS,
  CRM_LEAD_OBJECT_UNIVERSAL_IDENTIFIER,
} from 'src/crm/crm-universal-identifiers.constant';
import { activeField, oneToManyField } from 'src/shared/fields';
import {
  UTM_CAMPAIGN_FIELD_UNIVERSAL_IDENTIFIERS as FIELD_IDS,
  UTM_CAMPAIGN_OBJECT_UNIVERSAL_IDENTIFIER,
} from 'src/utm/utm-universal-identifiers.constant';

export default defineObject({
  universalIdentifier: UTM_CAMPAIGN_OBJECT_UNIVERSAL_IDENTIFIER,
  nameSingular: 'utmCampaign',
  namePlural: 'utmCampaigns',
  labelSingular: 'Campaign',
  labelPlural: 'Campaigns',
  description: 'A marketing campaign that brought in leads',
  icon: 'IconAd',
  fields: [
    activeField(FIELD_IDS.active),
    oneToManyField({
      universalIdentifier: FIELD_IDS.crmLeads,
      name: 'crmLeads',
      label: 'Leads',
      icon: 'IconTarget',
      targetObjectUniversalIdentifier: CRM_LEAD_OBJECT_UNIVERSAL_IDENTIFIER,
      targetFieldUniversalIdentifier: CRM_LEAD_FIELD_UNIVERSAL_IDENTIFIERS.campaign,
    }),
  ],
});
