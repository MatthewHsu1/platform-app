import { defineObject, FieldType, OnDeleteAction } from 'twenty-sdk/define';

import {
  PRODUCT_ATTRIBUTE_CUSTOM_VALUE_FIELD_UNIVERSAL_IDENTIFIERS,
  PRODUCT_ATTRIBUTE_CUSTOM_VALUE_OBJECT_UNIVERSAL_IDENTIFIER,
  PRODUCT_ATTRIBUTE_VALUE_FIELD_UNIVERSAL_IDENTIFIERS,
  PRODUCT_ATTRIBUTE_VALUE_OBJECT_UNIVERSAL_IDENTIFIER,
  PRODUCT_ATTR_EXCLUSION_VALUE_IDS_REL_FIELD_UNIVERSAL_IDENTIFIERS,
  PRODUCT_ATTR_EXCLUSION_VALUE_IDS_REL_OBJECT_UNIVERSAL_IDENTIFIER,
  PRODUCT_TEMPLATE_ATTRIBUTE_EXCLUSION_FIELD_UNIVERSAL_IDENTIFIERS,
  PRODUCT_TEMPLATE_ATTRIBUTE_EXCLUSION_OBJECT_UNIVERSAL_IDENTIFIER,
  PRODUCT_TEMPLATE_ATTRIBUTE_FIELD_UNIVERSAL_IDENTIFIERS,
  PRODUCT_TEMPLATE_ATTRIBUTE_LINE_FIELD_UNIVERSAL_IDENTIFIERS,
  PRODUCT_TEMPLATE_ATTRIBUTE_LINE_OBJECT_UNIVERSAL_IDENTIFIER,
  PRODUCT_TEMPLATE_ATTRIBUTE_VALUE_FIELD_UNIVERSAL_IDENTIFIERS as FIELD_IDS,
  PRODUCT_TEMPLATE_ATTRIBUTE_VALUE_OBJECT_UNIVERSAL_IDENTIFIER,
  PRODUCT_TEMPLATE_OBJECT_UNIVERSAL_IDENTIFIER,
  PRODUCT_VARIANT_COMBINATION_FIELD_UNIVERSAL_IDENTIFIERS,
  PRODUCT_VARIANT_COMBINATION_OBJECT_UNIVERSAL_IDENTIFIER,
} from 'src/product/product-universal-identifiers.constant';
import {
  appWritten,
  booleanField,
  currencyField,
  manyToOneField,
  oneToManyField,
} from 'src/shared/fields';

// a value on one product's attribute
// line. Code makes and archives these; staff set the extra price and exclusions.
export default defineObject({
  universalIdentifier: PRODUCT_TEMPLATE_ATTRIBUTE_VALUE_OBJECT_UNIVERSAL_IDENTIFIER,
  nameSingular: 'productTemplateAttributeValue',
  namePlural: 'productTemplateAttributeValues',
  labelSingular: 'Product attribute value',
  labelPlural: 'Product attribute values',
  description: 'A value an attribute line offers on one product',
  icon: 'IconListDetails',
  labelIdentifierFieldMetadataUniversalIdentifier: FIELD_IDS.name,
  fields: [
    appWritten({
      universalIdentifier: FIELD_IDS.name,
      name: 'name',
      label: 'Name',
      icon: 'IconAbc',
      type: FieldType.TEXT,
    }),
    appWritten(booleanField(FIELD_IDS.ptavActive, 'ptavActive', 'Active', 'IconCircleCheck', true)),
    appWritten(
      manyToOneField({
        universalIdentifier: FIELD_IDS.productAttributeValue,
        name: 'productAttributeValue',
        label: 'Value',
        icon: 'IconListDetails',
        onDelete: OnDeleteAction.CASCADE,
        targetObjectUniversalIdentifier: PRODUCT_ATTRIBUTE_VALUE_OBJECT_UNIVERSAL_IDENTIFIER,
        targetFieldUniversalIdentifier:
          PRODUCT_ATTRIBUTE_VALUE_FIELD_UNIVERSAL_IDENTIFIERS.templateValues,
      }),
    ),
    appWritten(
      manyToOneField({
        universalIdentifier: FIELD_IDS.attributeLine,
        name: 'attributeLine',
        label: 'Attribute line',
        icon: 'IconAdjustments',
        onDelete: OnDeleteAction.CASCADE,
        targetObjectUniversalIdentifier: PRODUCT_TEMPLATE_ATTRIBUTE_LINE_OBJECT_UNIVERSAL_IDENTIFIER,
        targetFieldUniversalIdentifier:
          PRODUCT_TEMPLATE_ATTRIBUTE_LINE_FIELD_UNIVERSAL_IDENTIFIERS.productTemplateValues,
      }),
    ),
    currencyField(FIELD_IDS.priceExtra, 'priceExtra', 'Extra price', 'IconCoin'),
    appWritten(
      manyToOneField({
        universalIdentifier: FIELD_IDS.productTmpl,
        name: 'productTmpl',
        label: 'Product',
        icon: 'IconPackage',
        onDelete: OnDeleteAction.CASCADE,
        targetObjectUniversalIdentifier: PRODUCT_TEMPLATE_OBJECT_UNIVERSAL_IDENTIFIER,
        targetFieldUniversalIdentifier:
          PRODUCT_TEMPLATE_ATTRIBUTE_FIELD_UNIVERSAL_IDENTIFIERS.attributeValues,
      }),
    ),
    oneToManyField({
      universalIdentifier: FIELD_IDS.excludeFor,
      name: 'excludeFor',
      label: 'Exclusions',
      icon: 'IconBan',
      targetObjectUniversalIdentifier: PRODUCT_TEMPLATE_ATTRIBUTE_EXCLUSION_OBJECT_UNIVERSAL_IDENTIFIER,
      targetFieldUniversalIdentifier:
        PRODUCT_TEMPLATE_ATTRIBUTE_EXCLUSION_FIELD_UNIVERSAL_IDENTIFIERS.productTemplateAttributeValue,
    }),
    oneToManyField({
      universalIdentifier: FIELD_IDS.variants,
      name: 'variants',
      label: 'Variant links',
      icon: 'IconLink',
      targetObjectUniversalIdentifier: PRODUCT_VARIANT_COMBINATION_OBJECT_UNIVERSAL_IDENTIFIER,
      targetFieldUniversalIdentifier:
        PRODUCT_VARIANT_COMBINATION_FIELD_UNIVERSAL_IDENTIFIERS.productTemplateAttributeValue,
    }),
    oneToManyField({
      universalIdentifier: FIELD_IDS.excludedBy,
      name: 'excludedBy',
      label: 'Excluded by links',
      icon: 'IconLink',
      targetObjectUniversalIdentifier: PRODUCT_ATTR_EXCLUSION_VALUE_IDS_REL_OBJECT_UNIVERSAL_IDENTIFIER,
      targetFieldUniversalIdentifier:
        PRODUCT_ATTR_EXCLUSION_VALUE_IDS_REL_FIELD_UNIVERSAL_IDENTIFIERS.productTemplateAttributeValue,
    }),
    oneToManyField({
      universalIdentifier: FIELD_IDS.customValues,
      name: 'customValues',
      label: 'Custom values',
      icon: 'IconTextCaption',
      targetObjectUniversalIdentifier: PRODUCT_ATTRIBUTE_CUSTOM_VALUE_OBJECT_UNIVERSAL_IDENTIFIER,
      targetFieldUniversalIdentifier:
        PRODUCT_ATTRIBUTE_CUSTOM_VALUE_FIELD_UNIVERSAL_IDENTIFIERS.customProductTemplateAttributeValue,
    }),
  ],
});
