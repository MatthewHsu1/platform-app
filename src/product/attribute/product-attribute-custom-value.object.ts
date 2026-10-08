import { defineObject, FieldType, OnDeleteAction } from 'twenty-sdk/define';

import {
  PRODUCT_ATTRIBUTE_CUSTOM_VALUE_FIELD_UNIVERSAL_IDENTIFIERS as FIELD_IDS,
  PRODUCT_ATTRIBUTE_CUSTOM_VALUE_OBJECT_UNIVERSAL_IDENTIFIER,
  PRODUCT_TEMPLATE_ATTRIBUTE_VALUE_FIELD_UNIVERSAL_IDENTIFIERS,
  PRODUCT_TEMPLATE_ATTRIBUTE_VALUE_OBJECT_UNIVERSAL_IDENTIFIER,
} from 'src/product/product-universal-identifiers.constant';
import { appWritten, manyToOneField, textField } from 'src/shared/fields';

// the free text a buyer typed for a value
// marked as free text. Sales links it to an order line later.
export default defineObject({
  universalIdentifier: PRODUCT_ATTRIBUTE_CUSTOM_VALUE_OBJECT_UNIVERSAL_IDENTIFIER,
  nameSingular: 'productAttributeCustomValue',
  namePlural: 'productAttributeCustomValues',
  labelSingular: 'Custom value',
  labelPlural: 'Custom values',
  description: 'Free text typed for an attribute value',
  icon: 'IconTextCaption',
  labelIdentifierFieldMetadataUniversalIdentifier: FIELD_IDS.name,
  fields: [
    appWritten({
      universalIdentifier: FIELD_IDS.name,
      name: 'name',
      label: 'Name',
      icon: 'IconAbc',
      type: FieldType.TEXT,
    }),
    manyToOneField({
      universalIdentifier: FIELD_IDS.customProductTemplateAttributeValue,
      name: 'customProductTemplateAttributeValue',
      label: 'Attribute value',
      icon: 'IconListDetails',
      onDelete: OnDeleteAction.RESTRICT,
      targetObjectUniversalIdentifier: PRODUCT_TEMPLATE_ATTRIBUTE_VALUE_OBJECT_UNIVERSAL_IDENTIFIER,
      targetFieldUniversalIdentifier:
        PRODUCT_TEMPLATE_ATTRIBUTE_VALUE_FIELD_UNIVERSAL_IDENTIFIERS.customValues,
    }),
    textField(FIELD_IDS.customValue, 'customValue', 'Custom value', 'IconTextCaption'),
  ],
});
