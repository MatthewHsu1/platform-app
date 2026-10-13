import { defineObject, FieldType, OnDeleteAction } from 'twenty-sdk/define';

import {
  PRODUCT_ATTR_EXCLUSION_VALUE_IDS_REL_FIELD_UNIVERSAL_IDENTIFIERS,
  PRODUCT_ATTR_EXCLUSION_VALUE_IDS_REL_OBJECT_UNIVERSAL_IDENTIFIER,
  PRODUCT_TEMPLATE_ATTRIBUTE_EXCLUSION_FIELD_UNIVERSAL_IDENTIFIERS as FIELD_IDS,
  PRODUCT_TEMPLATE_ATTRIBUTE_EXCLUSION_OBJECT_UNIVERSAL_IDENTIFIER,
  PRODUCT_TEMPLATE_ATTRIBUTE_FIELD_UNIVERSAL_IDENTIFIERS,
  PRODUCT_TEMPLATE_ATTRIBUTE_VALUE_FIELD_UNIVERSAL_IDENTIFIERS,
  PRODUCT_TEMPLATE_ATTRIBUTE_VALUE_OBJECT_UNIVERSAL_IDENTIFIER,
  PRODUCT_TEMPLATE_OBJECT_UNIVERSAL_IDENTIFIER,
} from 'src/product/product-universal-identifiers.constant';
import { appWritten, manyToOneField, oneToManyField } from 'src/shared/fields';

// when one value is chosen, these
// values of other lines are not allowed. The name reads "Red excludes L".
export default defineObject({
  universalIdentifier: PRODUCT_TEMPLATE_ATTRIBUTE_EXCLUSION_OBJECT_UNIVERSAL_IDENTIFIER,
  nameSingular: 'productTemplateAttributeExclusion',
  namePlural: 'productTemplateAttributeExclusions',
  labelSingular: 'Exclusion',
  labelPlural: 'Exclusions',
  description: 'Values that cannot be combined on one product',
  icon: 'IconBan',
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
      universalIdentifier: FIELD_IDS.productTemplateAttributeValue,
      name: 'productTemplateAttributeValue',
      label: 'When this value is chosen',
      icon: 'IconListDetails',
      onDelete: OnDeleteAction.CASCADE,
      targetObjectUniversalIdentifier: PRODUCT_TEMPLATE_ATTRIBUTE_VALUE_OBJECT_UNIVERSAL_IDENTIFIER,
      targetFieldUniversalIdentifier:
        PRODUCT_TEMPLATE_ATTRIBUTE_VALUE_FIELD_UNIVERSAL_IDENTIFIERS.excludeFor,
    }),
    manyToOneField({
      universalIdentifier: FIELD_IDS.productTmpl,
      name: 'productTmpl',
      label: 'Product',
      icon: 'IconPackage',
      onDelete: OnDeleteAction.CASCADE,
      targetObjectUniversalIdentifier: PRODUCT_TEMPLATE_OBJECT_UNIVERSAL_IDENTIFIER,
      targetFieldUniversalIdentifier: PRODUCT_TEMPLATE_ATTRIBUTE_FIELD_UNIVERSAL_IDENTIFIERS.exclusions,
    }),
    oneToManyField({
      universalIdentifier: FIELD_IDS.values,
      name: 'values',
      label: 'These values are not allowed',
      icon: 'IconBan',
      targetObjectUniversalIdentifier: PRODUCT_ATTR_EXCLUSION_VALUE_IDS_REL_OBJECT_UNIVERSAL_IDENTIFIER,
      targetFieldUniversalIdentifier:
        PRODUCT_ATTR_EXCLUSION_VALUE_IDS_REL_FIELD_UNIVERSAL_IDENTIFIERS.productTemplateAttributeExclusion,
      junctionTargetFieldUniversalIdentifier:
        PRODUCT_ATTR_EXCLUSION_VALUE_IDS_REL_FIELD_UNIVERSAL_IDENTIFIERS.productTemplateAttributeValue,
    }),
  ],
});
