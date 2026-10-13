import { defineIndex } from 'twenty-sdk/define';

import {
  PRODUCT_TAG_FIELD_UNIVERSAL_IDENTIFIERS,
  PRODUCT_TAG_NAME_INDEX_FIELD_UNIVERSAL_IDENTIFIER,
  PRODUCT_TAG_NAME_INDEX_UNIVERSAL_IDENTIFIER,
  PRODUCT_TAG_OBJECT_UNIVERSAL_IDENTIFIER,
} from 'src/product/product-universal-identifiers.constant';

export default defineIndex({
  universalIdentifier: PRODUCT_TAG_NAME_INDEX_UNIVERSAL_IDENTIFIER,
  objectUniversalIdentifier: PRODUCT_TAG_OBJECT_UNIVERSAL_IDENTIFIER,
  isUnique: true,
  fields: [
    {
      universalIdentifier: PRODUCT_TAG_NAME_INDEX_FIELD_UNIVERSAL_IDENTIFIER,
      fieldUniversalIdentifier: PRODUCT_TAG_FIELD_UNIVERSAL_IDENTIFIERS.name,
    },
  ],
});
