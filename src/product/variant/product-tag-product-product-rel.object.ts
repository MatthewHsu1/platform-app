import { defineObject, OnDeleteAction } from 'twenty-sdk/define';

import {
  PRODUCT_PRODUCT_FIELD_UNIVERSAL_IDENTIFIERS,
  PRODUCT_PRODUCT_OBJECT_UNIVERSAL_IDENTIFIER,
  PRODUCT_TAG_INVERSE_FIELD_UNIVERSAL_IDENTIFIERS,
  PRODUCT_TAG_OBJECT_UNIVERSAL_IDENTIFIER,
  PRODUCT_TAG_PRODUCT_PRODUCT_REL_FIELD_UNIVERSAL_IDENTIFIERS as FIELD_IDS,
  PRODUCT_TAG_PRODUCT_PRODUCT_REL_OBJECT_UNIVERSAL_IDENTIFIER,
} from 'src/product/product-universal-identifiers.constant';
import { manyToOneField } from 'src/shared/fields';

export default defineObject({
  universalIdentifier: PRODUCT_TAG_PRODUCT_PRODUCT_REL_OBJECT_UNIVERSAL_IDENTIFIER,
  nameSingular: 'productTagProductProductRel',
  namePlural: 'productTagProductProductRels',
  labelSingular: 'Variant tag link',
  labelPlural: 'Variant tag links',
  description: 'Puts a tag on a product variant',
  icon: 'IconLink',
  fields: [
    manyToOneField({
      universalIdentifier: FIELD_IDS.productProduct,
      name: 'productProduct',
      label: 'Product variant',
      icon: 'IconBoxMultiple',
      onDelete: OnDeleteAction.CASCADE,
      targetObjectUniversalIdentifier: PRODUCT_PRODUCT_OBJECT_UNIVERSAL_IDENTIFIER,
      targetFieldUniversalIdentifier: PRODUCT_PRODUCT_FIELD_UNIVERSAL_IDENTIFIERS.additionalProductTags,
    }),
    manyToOneField({
      universalIdentifier: FIELD_IDS.productTag,
      name: 'productTag',
      label: 'Tag',
      icon: 'IconTag',
      onDelete: OnDeleteAction.CASCADE,
      targetObjectUniversalIdentifier: PRODUCT_TAG_OBJECT_UNIVERSAL_IDENTIFIER,
      targetFieldUniversalIdentifier: PRODUCT_TAG_INVERSE_FIELD_UNIVERSAL_IDENTIFIERS.productProductLinks,
    }),
  ],
});
