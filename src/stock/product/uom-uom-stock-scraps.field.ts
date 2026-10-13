import { defineField } from 'twenty-sdk/define';

import { oneToManyField } from 'src/shared/fields';
import {
  STOCK_SCRAP_FIELD_UNIVERSAL_IDENTIFIERS,
  STOCK_SCRAP_OBJECT_UNIVERSAL_IDENTIFIER,
  STOCK_INVERSE_FIELD_UNIVERSAL_IDENTIFIERS as FIELD_IDS,
} from 'src/stock/stock-universal-identifiers.constant';
import { UOM_UOM_OBJECT_UNIVERSAL_IDENTIFIER } from 'src/uom/uom-universal-identifiers.constant';

export default defineField({
  ...oneToManyField({
    universalIdentifier: FIELD_IDS.uomUomStockScraps,
    name: 'stockScraps',
    label: 'Scraps',
    icon: 'IconTrash',
    targetObjectUniversalIdentifier: STOCK_SCRAP_OBJECT_UNIVERSAL_IDENTIFIER,
    targetFieldUniversalIdentifier: STOCK_SCRAP_FIELD_UNIVERSAL_IDENTIFIERS.productUom,
  }),
  objectUniversalIdentifier: UOM_UOM_OBJECT_UNIVERSAL_IDENTIFIER,
});
