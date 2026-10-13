import { defineObject, FieldType } from 'twenty-sdk/define';

import { numberField, oneToManyField, textField } from 'src/shared/fields';
import {
  STOCK_SCRAP_REASON_TAG_FIELD_UNIVERSAL_IDENTIFIERS as FIELD_IDS,
  STOCK_SCRAP_REASON_TAG_OBJECT_UNIVERSAL_IDENTIFIER,
  STOCK_SCRAP_STOCK_SCRAP_REASON_TAG_REL_FIELD_UNIVERSAL_IDENTIFIERS,
  STOCK_SCRAP_STOCK_SCRAP_REASON_TAG_REL_OBJECT_UNIVERSAL_IDENTIFIER,
} from 'src/stock/stock-universal-identifiers.constant';

// Staff own these rows; none are made at install.
export default defineObject({
  universalIdentifier: STOCK_SCRAP_REASON_TAG_OBJECT_UNIVERSAL_IDENTIFIER,
  nameSingular: 'stockScrapReasonTag',
  namePlural: 'stockScrapReasonTags',
  labelSingular: 'Scrap reason tag',
  labelPlural: 'Scrap reason tags',
  description: 'Why goods were scrapped',
  icon: 'IconTag',
  labelIdentifierFieldMetadataUniversalIdentifier: FIELD_IDS.name,
  fields: [
    textField(FIELD_IDS.name, 'name', 'Name', 'IconAbc'),
    numberField(FIELD_IDS.sequence, 'sequence', 'Sequence', 'IconArrowsSort', { decimals: 0, int: true, defaultValue: 10 }),
    {
      universalIdentifier: FIELD_IDS.color,
      name: 'color',
      label: 'Color',
      icon: 'IconPalette',
      type: FieldType.TEXT,
      defaultValue: "'#3C3C3C'",
    },
    oneToManyField({
      universalIdentifier: FIELD_IDS.scrapLinks,
      name: 'scrapLinks',
      label: 'Scraps',
      icon: 'IconTrash',
      targetObjectUniversalIdentifier: STOCK_SCRAP_STOCK_SCRAP_REASON_TAG_REL_OBJECT_UNIVERSAL_IDENTIFIER,
      targetFieldUniversalIdentifier: STOCK_SCRAP_STOCK_SCRAP_REASON_TAG_REL_FIELD_UNIVERSAL_IDENTIFIERS.stockScrapReasonTag,
      junctionTargetFieldUniversalIdentifier: STOCK_SCRAP_STOCK_SCRAP_REASON_TAG_REL_FIELD_UNIVERSAL_IDENTIFIERS.stockScrap,
    }),
  ],
});
