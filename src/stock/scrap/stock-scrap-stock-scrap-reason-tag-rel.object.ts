import { defineObject, OnDeleteAction } from 'twenty-sdk/define';

import { manyToOneField } from 'src/shared/fields';
import {
  STOCK_SCRAP_FIELD_UNIVERSAL_IDENTIFIERS,
  STOCK_SCRAP_OBJECT_UNIVERSAL_IDENTIFIER,
  STOCK_SCRAP_REASON_TAG_FIELD_UNIVERSAL_IDENTIFIERS,
  STOCK_SCRAP_REASON_TAG_OBJECT_UNIVERSAL_IDENTIFIER,
  STOCK_SCRAP_STOCK_SCRAP_REASON_TAG_REL_FIELD_UNIVERSAL_IDENTIFIERS as FIELD_IDS,
  STOCK_SCRAP_STOCK_SCRAP_REASON_TAG_REL_OBJECT_UNIVERSAL_IDENTIFIER,
} from 'src/stock/stock-universal-identifiers.constant';

export default defineObject({
  universalIdentifier: STOCK_SCRAP_STOCK_SCRAP_REASON_TAG_REL_OBJECT_UNIVERSAL_IDENTIFIER,
  nameSingular: 'stockScrapStockScrapReasonTagRel',
  namePlural: 'stockScrapStockScrapReasonTagRels',
  labelSingular: 'Scrap reason link',
  labelPlural: 'Scrap reason links',
  description: 'Puts a reason tag on a scrap',
  icon: 'IconLink',
  fields: [
    manyToOneField({
      universalIdentifier: FIELD_IDS.stockScrap,
      name: 'stockScrap',
      label: 'Scrap',
      icon: 'IconTrash',
      onDelete: OnDeleteAction.CASCADE,
      targetObjectUniversalIdentifier: STOCK_SCRAP_OBJECT_UNIVERSAL_IDENTIFIER,
      targetFieldUniversalIdentifier: STOCK_SCRAP_FIELD_UNIVERSAL_IDENTIFIERS.scrapReasonTags,
    }),
    manyToOneField({
      universalIdentifier: FIELD_IDS.stockScrapReasonTag,
      name: 'stockScrapReasonTag',
      label: 'Scrap reason tag',
      icon: 'IconTag',
      onDelete: OnDeleteAction.CASCADE,
      targetObjectUniversalIdentifier: STOCK_SCRAP_REASON_TAG_OBJECT_UNIVERSAL_IDENTIFIER,
      targetFieldUniversalIdentifier: STOCK_SCRAP_REASON_TAG_FIELD_UNIVERSAL_IDENTIFIERS.scrapLinks,
    }),
  ],
});
