import { defineObject, OnDeleteAction } from 'twenty-sdk/define';

import { manyToOneField } from 'src/shared/fields';
import {
  UTM_CAMPAIGN_FIELD_UNIVERSAL_IDENTIFIERS,
  UTM_CAMPAIGN_OBJECT_UNIVERSAL_IDENTIFIER,
  UTM_CAMPAIGN_TAG_FIELD_UNIVERSAL_IDENTIFIERS as FIELD_IDS,
  UTM_CAMPAIGN_TAG_OBJECT_UNIVERSAL_IDENTIFIER,
  UTM_TAG_FIELD_UNIVERSAL_IDENTIFIERS,
  UTM_TAG_OBJECT_UNIVERSAL_IDENTIFIER,
} from 'src/utm/utm-universal-identifiers.constant';

export default defineObject({
  universalIdentifier: UTM_CAMPAIGN_TAG_OBJECT_UNIVERSAL_IDENTIFIER,
  nameSingular: 'utmCampaignTag',
  namePlural: 'utmCampaignTags',
  labelSingular: 'Campaign tag link',
  labelPlural: 'Campaign tag links',
  description: 'Puts a tag on a campaign',
  icon: 'IconLink',
  fields: [
    manyToOneField({
      universalIdentifier: FIELD_IDS.campaign,
      name: 'campaign',
      label: 'Campaign',
      icon: 'IconAd',
      onDelete: OnDeleteAction.CASCADE,
      targetObjectUniversalIdentifier: UTM_CAMPAIGN_OBJECT_UNIVERSAL_IDENTIFIER,
      targetFieldUniversalIdentifier: UTM_CAMPAIGN_FIELD_UNIVERSAL_IDENTIFIERS.tags,
    }),
    manyToOneField({
      universalIdentifier: FIELD_IDS.tag,
      name: 'tag',
      label: 'Tag',
      icon: 'IconTag',
      onDelete: OnDeleteAction.CASCADE,
      targetObjectUniversalIdentifier: UTM_TAG_OBJECT_UNIVERSAL_IDENTIFIER,
      targetFieldUniversalIdentifier: UTM_TAG_FIELD_UNIVERSAL_IDENTIFIERS.campaignLinks,
    }),
  ],
});
