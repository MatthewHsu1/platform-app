import { defineObject, OnDeleteAction } from 'twenty-sdk/define';

import {
  PRODUCT_TAG_INVERSE_FIELD_UNIVERSAL_IDENTIFIERS,
  PRODUCT_TAG_OBJECT_UNIVERSAL_IDENTIFIER,
  PRODUCT_TAG_PRODUCT_TEMPLATE_REL_FIELD_UNIVERSAL_IDENTIFIERS as FIELD_IDS,
  PRODUCT_TAG_PRODUCT_TEMPLATE_REL_OBJECT_UNIVERSAL_IDENTIFIER,
  PRODUCT_TEMPLATE_FIELD_UNIVERSAL_IDENTIFIERS,
  PRODUCT_TEMPLATE_OBJECT_UNIVERSAL_IDENTIFIER,
} from 'src/product/product-universal-identifiers.constant';
import { manyToOneField } from 'src/shared/fields';

export default defineObject({
  universalIdentifier: PRODUCT_TAG_PRODUCT_TEMPLATE_REL_OBJECT_UNIVERSAL_IDENTIFIER,
  nameSingular: 'productTagProductTemplateRel',
  namePlural: 'productTagProductTemplateRels',
  labelSingular: 'Product tag link',
  labelPlural: 'Product tag links',
  description: 'Puts a tag on a product',
  icon: 'IconLink',
  fields: [
    manyToOneField({
      universalIdentifier: FIELD_IDS.productTemplate,
      name: 'productTemplate',
      label: 'Product',
      icon: 'IconPackage',
      onDelete: OnDeleteAction.CASCADE,
      targetObjectUniversalIdentifier: PRODUCT_TEMPLATE_OBJECT_UNIVERSAL_IDENTIFIER,
      targetFieldUniversalIdentifier: PRODUCT_TEMPLATE_FIELD_UNIVERSAL_IDENTIFIERS.tags,
    }),
    manyToOneField({
      universalIdentifier: FIELD_IDS.productTag,
      name: 'productTag',
      label: 'Tag',
      icon: 'IconTag',
      onDelete: OnDeleteAction.CASCADE,
      targetObjectUniversalIdentifier: PRODUCT_TAG_OBJECT_UNIVERSAL_IDENTIFIER,
      targetFieldUniversalIdentifier: PRODUCT_TAG_INVERSE_FIELD_UNIVERSAL_IDENTIFIERS.productTemplateLinks,
    }),
  ],
});
