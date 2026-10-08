import { defineObject, OnDeleteAction } from 'twenty-sdk/define';

import {
  PRODUCT_ATTR_EXCLUSION_VALUE_IDS_REL_FIELD_UNIVERSAL_IDENTIFIERS as FIELD_IDS,
  PRODUCT_ATTR_EXCLUSION_VALUE_IDS_REL_OBJECT_UNIVERSAL_IDENTIFIER,
  PRODUCT_TEMPLATE_ATTRIBUTE_EXCLUSION_FIELD_UNIVERSAL_IDENTIFIERS,
  PRODUCT_TEMPLATE_ATTRIBUTE_EXCLUSION_OBJECT_UNIVERSAL_IDENTIFIER,
  PRODUCT_TEMPLATE_ATTRIBUTE_VALUE_FIELD_UNIVERSAL_IDENTIFIERS,
  PRODUCT_TEMPLATE_ATTRIBUTE_VALUE_OBJECT_UNIVERSAL_IDENTIFIER,
} from 'src/product/product-universal-identifiers.constant';
import { manyToOneField } from 'src/shared/fields';

export default defineObject({
  universalIdentifier: PRODUCT_ATTR_EXCLUSION_VALUE_IDS_REL_OBJECT_UNIVERSAL_IDENTIFIER,
  nameSingular: 'productAttrExclusionValueIdsRel',
  namePlural: 'productAttrExclusionValueIdsRels',
  labelSingular: 'Exclusion value link',
  labelPlural: 'Exclusion value links',
  description: 'Lists a value an exclusion forbids',
  icon: 'IconLink',
  fields: [
    manyToOneField({
      universalIdentifier: FIELD_IDS.productTemplateAttributeExclusion,
      name: 'productTemplateAttributeExclusion',
      label: 'Exclusion',
      icon: 'IconBan',
      onDelete: OnDeleteAction.CASCADE,
      targetObjectUniversalIdentifier: PRODUCT_TEMPLATE_ATTRIBUTE_EXCLUSION_OBJECT_UNIVERSAL_IDENTIFIER,
      targetFieldUniversalIdentifier: PRODUCT_TEMPLATE_ATTRIBUTE_EXCLUSION_FIELD_UNIVERSAL_IDENTIFIERS.values,
    }),
    manyToOneField({
      universalIdentifier: FIELD_IDS.productTemplateAttributeValue,
      name: 'productTemplateAttributeValue',
      label: 'Product attribute value',
      icon: 'IconListDetails',
      onDelete: OnDeleteAction.CASCADE,
      targetObjectUniversalIdentifier: PRODUCT_TEMPLATE_ATTRIBUTE_VALUE_OBJECT_UNIVERSAL_IDENTIFIER,
      targetFieldUniversalIdentifier: PRODUCT_TEMPLATE_ATTRIBUTE_VALUE_FIELD_UNIVERSAL_IDENTIFIERS.excludedBy,
    }),
  ],
});
