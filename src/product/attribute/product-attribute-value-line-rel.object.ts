import { defineObject, OnDeleteAction } from 'twenty-sdk/define';

import {
  PRODUCT_ATTRIBUTE_VALUE_FIELD_UNIVERSAL_IDENTIFIERS,
  PRODUCT_ATTRIBUTE_VALUE_LINE_REL_FIELD_UNIVERSAL_IDENTIFIERS as FIELD_IDS,
  PRODUCT_ATTRIBUTE_VALUE_LINE_REL_OBJECT_UNIVERSAL_IDENTIFIER,
  PRODUCT_ATTRIBUTE_VALUE_OBJECT_UNIVERSAL_IDENTIFIER,
  PRODUCT_TEMPLATE_ATTRIBUTE_LINE_FIELD_UNIVERSAL_IDENTIFIERS,
  PRODUCT_TEMPLATE_ATTRIBUTE_LINE_OBJECT_UNIVERSAL_IDENTIFIER,
} from 'src/product/product-universal-identifiers.constant';
import { manyToOneField } from 'src/shared/fields';

export default defineObject({
  universalIdentifier: PRODUCT_ATTRIBUTE_VALUE_LINE_REL_OBJECT_UNIVERSAL_IDENTIFIER,
  nameSingular: 'productAttributeValueLineRel',
  namePlural: 'productAttributeValueLineRels',
  labelSingular: 'Attribute value link',
  labelPlural: 'Attribute value links',
  description: 'Offers an attribute value on an attribute line',
  icon: 'IconLink',
  fields: [
    manyToOneField({
      universalIdentifier: FIELD_IDS.productTemplateAttributeLine,
      name: 'productTemplateAttributeLine',
      label: 'Attribute line',
      icon: 'IconAdjustments',
      onDelete: OnDeleteAction.CASCADE,
      targetObjectUniversalIdentifier: PRODUCT_TEMPLATE_ATTRIBUTE_LINE_OBJECT_UNIVERSAL_IDENTIFIER,
      targetFieldUniversalIdentifier: PRODUCT_TEMPLATE_ATTRIBUTE_LINE_FIELD_UNIVERSAL_IDENTIFIERS.values,
    }),
    manyToOneField({
      universalIdentifier: FIELD_IDS.productAttributeValue,
      name: 'productAttributeValue',
      label: 'Attribute value',
      icon: 'IconListDetails',
      onDelete: OnDeleteAction.CASCADE,
      targetObjectUniversalIdentifier: PRODUCT_ATTRIBUTE_VALUE_OBJECT_UNIVERSAL_IDENTIFIER,
      targetFieldUniversalIdentifier: PRODUCT_ATTRIBUTE_VALUE_FIELD_UNIVERSAL_IDENTIFIERS.pavAttributeLines,
    }),
  ],
});
