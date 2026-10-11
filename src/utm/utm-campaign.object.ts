import { defineObject, OnDeleteAction, STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS } from 'twenty-sdk/define';

import {
  CRM_LEAD_FIELD_UNIVERSAL_IDENTIFIERS,
  CRM_LEAD_OBJECT_UNIVERSAL_IDENTIFIER,
} from 'src/crm/crm-universal-identifiers.constant';
import { activeField, booleanField, manyToOneField, oneToManyField, textField } from 'src/shared/fields';
import {
  UTM_CAMPAIGN_FIELD_UNIVERSAL_IDENTIFIERS as FIELD_IDS,
  UTM_CAMPAIGN_OBJECT_UNIVERSAL_IDENTIFIER,
  UTM_CAMPAIGN_TAG_FIELD_UNIVERSAL_IDENTIFIERS,
  UTM_CAMPAIGN_TAG_OBJECT_UNIVERSAL_IDENTIFIER,
  UTM_INVERSE_FIELD_UNIVERSAL_IDENTIFIERS,
  UTM_STAGE_FIELD_UNIVERSAL_IDENTIFIERS,
  UTM_STAGE_OBJECT_UNIVERSAL_IDENTIFIER,
} from 'src/utm/utm-universal-identifiers.constant';

// "name" is the campaign's unique identifier: a name already taken gets a
// counter. Responsible and stage are filled after the save, so the campaign
// trigger keeps them rather than a required rule.
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
    manyToOneField({
      universalIdentifier: FIELD_IDS.responsible,
      name: 'responsible',
      label: 'Responsible',
      icon: 'IconUserCircle',
      onDelete: OnDeleteAction.RESTRICT,
      targetObjectUniversalIdentifier: STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.workspaceMember.universalIdentifier,
      targetFieldUniversalIdentifier: UTM_INVERSE_FIELD_UNIVERSAL_IDENTIFIERS.workspaceMemberUtmCampaigns,
    }),
    manyToOneField({
      universalIdentifier: FIELD_IDS.stage,
      name: 'stage',
      label: 'Stage',
      icon: 'IconProgress',
      onDelete: OnDeleteAction.RESTRICT,
      targetObjectUniversalIdentifier: UTM_STAGE_OBJECT_UNIVERSAL_IDENTIFIER,
      targetFieldUniversalIdentifier: UTM_STAGE_FIELD_UNIVERSAL_IDENTIFIERS.campaigns,
    }),
    oneToManyField({
      universalIdentifier: FIELD_IDS.tags,
      name: 'tags',
      label: 'Tags',
      icon: 'IconTag',
      targetObjectUniversalIdentifier: UTM_CAMPAIGN_TAG_OBJECT_UNIVERSAL_IDENTIFIER,
      targetFieldUniversalIdentifier: UTM_CAMPAIGN_TAG_FIELD_UNIVERSAL_IDENTIFIERS.campaign,
      junctionTargetFieldUniversalIdentifier: UTM_CAMPAIGN_TAG_FIELD_UNIVERSAL_IDENTIFIERS.tag,
    }),
    booleanField(FIELD_IDS.isAutoCampaign, 'isAutoCampaign', 'Automatically generated', 'IconRobot', false),
    textField(FIELD_IDS.color, 'color', 'Color', 'IconPalette'),
  ],
});
