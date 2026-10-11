import { defineObject, FieldType } from 'twenty-sdk/define';

import { oneToManyField, seedKeyField, textField } from 'src/shared/fields';
import {
  UTM_CAMPAIGN_TAG_FIELD_UNIVERSAL_IDENTIFIERS,
  UTM_CAMPAIGN_TAG_OBJECT_UNIVERSAL_IDENTIFIER,
  UTM_TAG_FIELD_UNIVERSAL_IDENTIFIERS as FIELD_IDS,
  UTM_TAG_OBJECT_UNIVERSAL_IDENTIFIER,
} from 'src/utm/utm-universal-identifiers.constant';

// Tag names are unique. A deleted tag keeps its name taken until it is
// removed from the trash.
export default defineObject({
  universalIdentifier: UTM_TAG_OBJECT_UNIVERSAL_IDENTIFIER,
  nameSingular: 'utmTag',
  namePlural: 'utmTags',
  labelSingular: 'Campaign tag',
  labelPlural: 'Campaign tags',
  description: 'A label for marketing campaigns',
  icon: 'IconTag',
  labelIdentifierFieldMetadataUniversalIdentifier: FIELD_IDS.name,
  fields: [
    { universalIdentifier: FIELD_IDS.name, name: 'name', label: 'Name', icon: 'IconAbc', type: FieldType.TEXT },
    textField(FIELD_IDS.color, 'color', 'Color', 'IconPalette'),
    oneToManyField({
      universalIdentifier: FIELD_IDS.campaignLinks,
      name: 'campaignLinks',
      label: 'Campaigns',
      icon: 'IconAd',
      targetObjectUniversalIdentifier: UTM_CAMPAIGN_TAG_OBJECT_UNIVERSAL_IDENTIFIER,
      targetFieldUniversalIdentifier: UTM_CAMPAIGN_TAG_FIELD_UNIVERSAL_IDENTIFIERS.tag,
      junctionTargetFieldUniversalIdentifier: UTM_CAMPAIGN_TAG_FIELD_UNIVERSAL_IDENTIFIERS.campaign,
    }),
    seedKeyField(FIELD_IDS.seedKey),
  ],
});
