import { defineObject, OnDeleteAction } from 'twenty-sdk/define';

import {
  PRODUCT_PRODUCT_ATTRIBUTE_FIELD_UNIVERSAL_IDENTIFIERS,
  PRODUCT_PRODUCT_OBJECT_UNIVERSAL_IDENTIFIER,
  PRODUCT_TEMPLATE_ATTRIBUTE_VALUE_FIELD_UNIVERSAL_IDENTIFIERS,
  PRODUCT_TEMPLATE_ATTRIBUTE_VALUE_OBJECT_UNIVERSAL_IDENTIFIER,
  PRODUCT_VARIANT_COMBINATION_FIELD_UNIVERSAL_IDENTIFIERS as FIELD_IDS,
  PRODUCT_VARIANT_COMBINATION_OBJECT_UNIVERSAL_IDENTIFIER,
} from 'src/product/product-universal-identifiers.constant';
import { manyToOneField } from 'src/shared/fields';

export default defineObject({
  universalIdentifier: PRODUCT_VARIANT_COMBINATION_OBJECT_UNIVERSAL_IDENTIFIER,
  nameSingular: 'productVariantCombination',
  namePlural: 'productVariantCombinations',
  labelSingular: 'Variant value link',
  labelPlural: 'Variant value links',
  description: 'Puts an attribute value on a variant',
  icon: 'IconLink',
  fields: [
    manyToOneField({
      universalIdentifier: FIELD_IDS.productProduct,
      name: 'productProduct',
      label: 'Variant',
      icon: 'IconBoxMultiple',
      onDelete: OnDeleteAction.CASCADE,
      targetObjectUniversalIdentifier: PRODUCT_PRODUCT_OBJECT_UNIVERSAL_IDENTIFIER,
      targetFieldUniversalIdentifier: PRODUCT_PRODUCT_ATTRIBUTE_FIELD_UNIVERSAL_IDENTIFIERS.productTemplateAttributeValues,
    }),
    manyToOneField({
      universalIdentifier: FIELD_IDS.productTemplateAttributeValue,
      name: 'productTemplateAttributeValue',
      label: 'Product attribute value',
      icon: 'IconListDetails',
      onDelete: OnDeleteAction.CASCADE,
      targetObjectUniversalIdentifier: PRODUCT_TEMPLATE_ATTRIBUTE_VALUE_OBJECT_UNIVERSAL_IDENTIFIER,
      targetFieldUniversalIdentifier: PRODUCT_TEMPLATE_ATTRIBUTE_VALUE_FIELD_UNIVERSAL_IDENTIFIERS.variants,
    }),
  ],
});
