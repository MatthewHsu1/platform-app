import { defineField, OnDeleteAction } from 'twenty-sdk/define';

import { PRODUCT_CATEGORY_OBJECT_UNIVERSAL_IDENTIFIER } from 'src/product/product-universal-identifiers.constant';
import { manyToOneField } from 'src/shared/fields';
import {
  PRODUCT_REMOVAL_FIELD_UNIVERSAL_IDENTIFIERS,
  PRODUCT_REMOVAL_OBJECT_UNIVERSAL_IDENTIFIER,
  ROUTING_INVERSE_FIELD_UNIVERSAL_IDENTIFIERS,
} from 'src/stock/routing-universal-identifiers.constant';

export default defineField({
  ...manyToOneField({
    universalIdentifier: ROUTING_INVERSE_FIELD_UNIVERSAL_IDENTIFIERS.productCategoryRemovalStrategy,
    name: 'removalStrategy',
    label: 'Force Removal Strategy',
    icon: 'IconArrowsSort',
    onDelete: OnDeleteAction.SET_NULL,
    targetObjectUniversalIdentifier: PRODUCT_REMOVAL_OBJECT_UNIVERSAL_IDENTIFIER,
    targetFieldUniversalIdentifier: PRODUCT_REMOVAL_FIELD_UNIVERSAL_IDENTIFIERS.categories,
  }),
  objectUniversalIdentifier: PRODUCT_CATEGORY_OBJECT_UNIVERSAL_IDENTIFIER,
});
