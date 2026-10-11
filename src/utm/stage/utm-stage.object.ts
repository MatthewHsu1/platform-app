import { defineObject, FieldType } from 'twenty-sdk/define';

import { numberField, oneToManyField, seedKeyField } from 'src/shared/fields';
import {
  UTM_CAMPAIGN_FIELD_UNIVERSAL_IDENTIFIERS,
  UTM_CAMPAIGN_OBJECT_UNIVERSAL_IDENTIFIER,
  UTM_STAGE_FIELD_UNIVERSAL_IDENTIFIERS as FIELD_IDS,
  UTM_STAGE_OBJECT_UNIVERSAL_IDENTIFIER,
} from 'src/utm/utm-universal-identifiers.constant';

export default defineObject({
  universalIdentifier: UTM_STAGE_OBJECT_UNIVERSAL_IDENTIFIER,
  nameSingular: 'utmStage',
  namePlural: 'utmStages',
  labelSingular: 'Campaign stage',
  labelPlural: 'Campaign stages',
  description: 'A step a marketing campaign goes through',
  icon: 'IconProgress',
  labelIdentifierFieldMetadataUniversalIdentifier: FIELD_IDS.name,
  fields: [
    { universalIdentifier: FIELD_IDS.name, name: 'name', label: 'Name', icon: 'IconAbc', type: FieldType.TEXT },
    numberField(FIELD_IDS.sequence, 'sequence', 'Sequence', 'IconArrowsSort', { decimals: 0, int: true, defaultValue: 1 }),
    oneToManyField({
      universalIdentifier: FIELD_IDS.campaigns,
      name: 'campaigns',
      label: 'Campaigns',
      icon: 'IconAd',
      targetObjectUniversalIdentifier: UTM_CAMPAIGN_OBJECT_UNIVERSAL_IDENTIFIER,
      targetFieldUniversalIdentifier: UTM_CAMPAIGN_FIELD_UNIVERSAL_IDENTIFIERS.stage,
    }),
    seedKeyField(FIELD_IDS.seedKey),
  ],
});
