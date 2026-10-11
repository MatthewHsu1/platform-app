import { defineField, STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS } from 'twenty-sdk/define';

import { oneToManyField } from 'src/shared/fields';
import {
  UTM_CAMPAIGN_FIELD_UNIVERSAL_IDENTIFIERS,
  UTM_CAMPAIGN_OBJECT_UNIVERSAL_IDENTIFIER,
  UTM_INVERSE_FIELD_UNIVERSAL_IDENTIFIERS as INVERSE_IDS,
} from 'src/utm/utm-universal-identifiers.constant';

export default defineField({
  ...oneToManyField({
    universalIdentifier: INVERSE_IDS.workspaceMemberUtmCampaigns,
    name: 'utmCampaigns',
    label: 'Campaigns as responsible',
    icon: 'IconAd',
    targetObjectUniversalIdentifier: UTM_CAMPAIGN_OBJECT_UNIVERSAL_IDENTIFIER,
    targetFieldUniversalIdentifier: UTM_CAMPAIGN_FIELD_UNIVERSAL_IDENTIFIERS.responsible,
  }),
  objectUniversalIdentifier: STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.workspaceMember.universalIdentifier,
});
