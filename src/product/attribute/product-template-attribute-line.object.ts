import { defineObject, FieldType, OnDeleteAction } from 'twenty-sdk/define';

import {
  PRODUCT_ATTRIBUTE_FIELD_UNIVERSAL_IDENTIFIERS,
  PRODUCT_ATTRIBUTE_OBJECT_UNIVERSAL_IDENTIFIER,
  PRODUCT_ATTRIBUTE_VALUE_LINE_REL_FIELD_UNIVERSAL_IDENTIFIERS,
  PRODUCT_ATTRIBUTE_VALUE_LINE_REL_OBJECT_UNIVERSAL_IDENTIFIER,
  PRODUCT_TEMPLATE_ATTRIBUTE_LINE_FIELD_UNIVERSAL_IDENTIFIERS as FIELD_IDS,
  PRODUCT_TEMPLATE_ATTRIBUTE_LINE_OBJECT_UNIVERSAL_IDENTIFIER,
  PRODUCT_TEMPLATE_ATTRIBUTE_VALUE_FIELD_UNIVERSAL_IDENTIFIERS,
  PRODUCT_TEMPLATE_ATTRIBUTE_VALUE_OBJECT_UNIVERSAL_IDENTIFIER,
  PRODUCT_TEMPLATE_ATTRIBUTE_FIELD_UNIVERSAL_IDENTIFIERS,
  PRODUCT_TEMPLATE_OBJECT_UNIVERSAL_IDENTIFIER,
} from 'src/product/product-universal-identifiers.constant';
import {
  appWritten,
  booleanField,
  manyToOneField,
  numberField,
  oneToManyField,
} from 'src/shared/fields';

// an attribute on one product, with the
// values that product offers. The name is the attribute's name, written by code.
export default defineObject({
  universalIdentifier: PRODUCT_TEMPLATE_ATTRIBUTE_LINE_OBJECT_UNIVERSAL_IDENTIFIER,
  nameSingular: 'productTemplateAttributeLine',
  namePlural: 'productTemplateAttributeLines',
  labelSingular: 'Attribute line',
  labelPlural: 'Attribute lines',
  description: 'An attribute on a product with the values it offers',
  icon: 'IconAdjustments',
  labelIdentifierFieldMetadataUniversalIdentifier: FIELD_IDS.name,
  fields: [
    appWritten({
      universalIdentifier: FIELD_IDS.name,
      name: 'name',
      label: 'Name',
      icon: 'IconAbc',
      type: FieldType.TEXT,
    }),
    booleanField(FIELD_IDS.active, 'active', 'Active', 'IconCircleCheck', true),
    manyToOneField({
      universalIdentifier: FIELD_IDS.productTmpl,
      name: 'productTmpl',
      label: 'Product',
      icon: 'IconPackage',
      onDelete: OnDeleteAction.CASCADE,
      targetObjectUniversalIdentifier: PRODUCT_TEMPLATE_OBJECT_UNIVERSAL_IDENTIFIER,
      targetFieldUniversalIdentifier:
        PRODUCT_TEMPLATE_ATTRIBUTE_FIELD_UNIVERSAL_IDENTIFIERS.attributeLines,
    }),
    numberField(FIELD_IDS.sequence, 'sequence', 'Sequence', 'IconArrowsSort', {
      decimals: 0,
      int: true,
      defaultValue: 10,
    }),
    manyToOneField({
      universalIdentifier: FIELD_IDS.attribute,
      name: 'attribute',
      label: 'Attribute',
      icon: 'IconAdjustments',
      onDelete: OnDeleteAction.RESTRICT,
      targetObjectUniversalIdentifier: PRODUCT_ATTRIBUTE_OBJECT_UNIVERSAL_IDENTIFIER,
      targetFieldUniversalIdentifier: PRODUCT_ATTRIBUTE_FIELD_UNIVERSAL_IDENTIFIERS.attributeLines,
    }),
    oneToManyField({
      universalIdentifier: FIELD_IDS.values,
      name: 'values',
      label: 'Values',
      icon: 'IconListDetails',
      targetObjectUniversalIdentifier: PRODUCT_ATTRIBUTE_VALUE_LINE_REL_OBJECT_UNIVERSAL_IDENTIFIER,
      targetFieldUniversalIdentifier:
        PRODUCT_ATTRIBUTE_VALUE_LINE_REL_FIELD_UNIVERSAL_IDENTIFIERS.productTemplateAttributeLine,
      junctionTargetFieldUniversalIdentifier:
        PRODUCT_ATTRIBUTE_VALUE_LINE_REL_FIELD_UNIVERSAL_IDENTIFIERS.productAttributeValue,
    }),
    appWritten(
      numberField(FIELD_IDS.valueCount, 'valueCount', 'Value count', 'IconHash', {
        decimals: 0,
        int: true,
      }),
    ),
    oneToManyField({
      universalIdentifier: FIELD_IDS.productTemplateValues,
      name: 'productTemplateValues',
      label: 'Product attribute values',
      icon: 'IconLink',
      targetObjectUniversalIdentifier: PRODUCT_TEMPLATE_ATTRIBUTE_VALUE_OBJECT_UNIVERSAL_IDENTIFIER,
      targetFieldUniversalIdentifier:
        PRODUCT_TEMPLATE_ATTRIBUTE_VALUE_FIELD_UNIVERSAL_IDENTIFIERS.attributeLine,
    }),
  ],
});
