import { defineObject, FieldType } from 'twenty-sdk/define';

import { CREATE_VARIANT, DISPLAY_TYPE } from 'src/product/product-options.constant';
import {
  PRODUCT_ATTRIBUTE_FIELD_UNIVERSAL_IDENTIFIERS as FIELD_IDS,
  PRODUCT_ATTRIBUTE_OBJECT_UNIVERSAL_IDENTIFIER,
  PRODUCT_ATTRIBUTE_VALUE_FIELD_UNIVERSAL_IDENTIFIERS,
  PRODUCT_ATTRIBUTE_VALUE_OBJECT_UNIVERSAL_IDENTIFIER,
  PRODUCT_TEMPLATE_ATTRIBUTE_LINE_FIELD_UNIVERSAL_IDENTIFIERS,
  PRODUCT_TEMPLATE_ATTRIBUTE_LINE_OBJECT_UNIVERSAL_IDENTIFIER,
} from 'src/product/product-universal-identifiers.constant';
import { booleanField, numberField, oneToManyField, selectField } from 'src/shared/fields';

// a property like Size or Color that products vary on.
export default defineObject({
  universalIdentifier: PRODUCT_ATTRIBUTE_OBJECT_UNIVERSAL_IDENTIFIER,
  nameSingular: 'productAttribute',
  namePlural: 'productAttributes',
  labelSingular: 'Attribute',
  labelPlural: 'Attributes',
  description: 'A property products vary on, like size or color',
  icon: 'IconAdjustments',
  labelIdentifierFieldMetadataUniversalIdentifier: FIELD_IDS.name,
  fields: [
    {
      universalIdentifier: FIELD_IDS.name,
      name: 'name',
      label: 'Name',
      icon: 'IconAbc',
      type: FieldType.TEXT,
    },
    booleanField(FIELD_IDS.active, 'active', 'Active', 'IconCircleCheck', true),
    selectField(
      FIELD_IDS.createVariant,
      'createVariant',
      'Variant creation',
      'IconBoxMultiple',
      CREATE_VARIANT.ALWAYS,
      [
        { value: CREATE_VARIANT.ALWAYS, label: 'Instantly', color: 'green' },
        { value: CREATE_VARIANT.DYNAMIC, label: 'Dynamically', color: 'blue' },
        { value: CREATE_VARIANT.NO_VARIANT, label: 'Never', color: 'gray' },
      ],
    ),
    selectField(FIELD_IDS.displayType, 'displayType', 'Display type', 'IconEye', DISPLAY_TYPE.RADIO, [
      { value: DISPLAY_TYPE.RADIO, label: 'Radio', color: 'gray' },
      { value: DISPLAY_TYPE.PILLS, label: 'Pills', color: 'gray' },
      { value: DISPLAY_TYPE.SELECT, label: 'Select', color: 'gray' },
      { value: DISPLAY_TYPE.COLOR, label: 'Color', color: 'gray' },
      { value: DISPLAY_TYPE.MULTI, label: 'Multi-checkbox', color: 'gray' },
      { value: DISPLAY_TYPE.IMAGE, label: 'Image', color: 'gray' },
    ]),
    numberField(FIELD_IDS.sequence, 'sequence', 'Sequence', 'IconArrowsSort', {
      decimals: 0,
      int: true,
      defaultValue: 20,
    }),
    oneToManyField({
      universalIdentifier: FIELD_IDS.values,
      name: 'values',
      label: 'Values',
      icon: 'IconListDetails',
      targetObjectUniversalIdentifier: PRODUCT_ATTRIBUTE_VALUE_OBJECT_UNIVERSAL_IDENTIFIER,
      targetFieldUniversalIdentifier: PRODUCT_ATTRIBUTE_VALUE_FIELD_UNIVERSAL_IDENTIFIERS.attribute,
    }),
    oneToManyField({
      universalIdentifier: FIELD_IDS.attributeLines,
      name: 'attributeLines',
      label: 'Product lines',
      icon: 'IconLink',
      targetObjectUniversalIdentifier: PRODUCT_TEMPLATE_ATTRIBUTE_LINE_OBJECT_UNIVERSAL_IDENTIFIER,
      targetFieldUniversalIdentifier:
        PRODUCT_TEMPLATE_ATTRIBUTE_LINE_FIELD_UNIVERSAL_IDENTIFIERS.attribute,
    }),
  ],
});
