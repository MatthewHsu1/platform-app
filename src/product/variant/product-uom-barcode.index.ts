import { defineIndex } from 'twenty-sdk/define';

import {
  PRODUCT_UOM_BARCODE_INDEX_FIELD_UNIVERSAL_IDENTIFIER,
  PRODUCT_UOM_BARCODE_INDEX_UNIVERSAL_IDENTIFIER,
  PRODUCT_UOM_FIELD_UNIVERSAL_IDENTIFIERS,
  PRODUCT_UOM_OBJECT_UNIVERSAL_IDENTIFIER,
} from 'src/product/product-universal-identifiers.constant';

export default defineIndex({
  universalIdentifier: PRODUCT_UOM_BARCODE_INDEX_UNIVERSAL_IDENTIFIER,
  objectUniversalIdentifier: PRODUCT_UOM_OBJECT_UNIVERSAL_IDENTIFIER,
  isUnique: true,
  fields: [
    {
      universalIdentifier: PRODUCT_UOM_BARCODE_INDEX_FIELD_UNIVERSAL_IDENTIFIER,
      fieldUniversalIdentifier: PRODUCT_UOM_FIELD_UNIVERSAL_IDENTIFIERS.barcode,
    },
  ],
});
