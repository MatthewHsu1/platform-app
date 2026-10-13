import { defineObject, FieldType, OnDeleteAction } from 'twenty-sdk/define';

import {
  PRODUCT_ATTRIBUTE_FIELD_UNIVERSAL_IDENTIFIERS,
  PRODUCT_ATTRIBUTE_OBJECT_UNIVERSAL_IDENTIFIER,
  PRODUCT_ATTRIBUTE_VALUE_FIELD_UNIVERSAL_IDENTIFIERS as FIELD_IDS,
  PRODUCT_ATTRIBUTE_VALUE_LINE_REL_FIELD_UNIVERSAL_IDENTIFIERS,
  PRODUCT_ATTRIBUTE_VALUE_LINE_REL_OBJECT_UNIVERSAL_IDENTIFIER,
  PRODUCT_ATTRIBUTE_VALUE_OBJECT_UNIVERSAL_IDENTIFIER,
  PRODUCT_TEMPLATE_ATTRIBUTE_VALUE_FIELD_UNIVERSAL_IDENTIFIERS,
  PRODUCT_TEMPLATE_ATTRIBUTE_VALUE_OBJECT_UNIVERSAL_IDENTIFIER,
} from 'src/product/product-universal-identifiers.constant';
import {
  booleanField,
  currencyField,
  filesField,
  manyToOneField,
  numberField,
  oneToManyField,
  textField,
} from 'src/shared/fields';

// one choice of an attribute, like Red.
export default defineObject({
  universalIdentifier: PRODUCT_ATTRIBUTE_VALUE_OBJECT_UNIVERSAL_IDENTIFIER,
  nameSingular: 'productAttributeValue',
  namePlural: 'productAttributeValues',
  labelSingular: 'Attribute value',
  labelPlural: 'Attribute values',
  description: 'One choice of an attribute, like Red',
  icon: 'IconListDetails',
  labelIdentifierFieldMetadataUniversalIdentifier: FIELD_IDS.name,
  fields: [
    {
      universalIdentifier: FIELD_IDS.name,
      name: 'name',
      label: 'Value',
      icon: 'IconAbc',
      type: FieldType.TEXT,
    },
    numberField(FIELD_IDS.sequence, 'sequence', 'Sequence', 'IconArrowsSort', {
      decimals: 0,
      int: true,
      defaultValue: 0,
    }),
    manyToOneField({
      universalIdentifier: FIELD_IDS.attribute,
      name: 'attribute',
      label: 'Attribute',
      icon: 'IconAdjustments',
      onDelete: OnDeleteAction.CASCADE,
      targetObjectUniversalIdentifier: PRODUCT_ATTRIBUTE_OBJECT_UNIVERSAL_IDENTIFIER,
      targetFieldUniversalIdentifier: PRODUCT_ATTRIBUTE_FIELD_UNIVERSAL_IDENTIFIERS.values,
    }),
    currencyField(FIELD_IDS.defaultExtraPrice, 'defaultExtraPrice', 'Default extra price', 'IconCoin'),
    booleanField(FIELD_IDS.isCustom, 'isCustom', 'Free text', 'IconTextCaption', false),
    textField(FIELD_IDS.htmlColor, 'htmlColor', 'Color', 'IconPalette'),
    filesField(FIELD_IDS.image, 'image', 'Image', 'IconPhoto'),
    booleanField(FIELD_IDS.active, 'active', 'Active', 'IconCircleCheck', true),
    oneToManyField({
      universalIdentifier: FIELD_IDS.pavAttributeLines,
      name: 'pavAttributeLines',
      label: 'Line links',
      icon: 'IconLink',
      targetObjectUniversalIdentifier: PRODUCT_ATTRIBUTE_VALUE_LINE_REL_OBJECT_UNIVERSAL_IDENTIFIER,
      targetFieldUniversalIdentifier:
        PRODUCT_ATTRIBUTE_VALUE_LINE_REL_FIELD_UNIVERSAL_IDENTIFIERS.productAttributeValue,
    }),
    oneToManyField({
      universalIdentifier: FIELD_IDS.templateValues,
      name: 'templateValues',
      label: 'Product values',
      icon: 'IconLink',
      targetObjectUniversalIdentifier: PRODUCT_TEMPLATE_ATTRIBUTE_VALUE_OBJECT_UNIVERSAL_IDENTIFIER,
      targetFieldUniversalIdentifier:
        PRODUCT_TEMPLATE_ATTRIBUTE_VALUE_FIELD_UNIVERSAL_IDENTIFIERS.productAttributeValue,
    }),
  ],
});
