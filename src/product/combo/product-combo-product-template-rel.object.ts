import { defineObject, OnDeleteAction } from 'twenty-sdk/define';

import {
  PRODUCT_COMBO_INVERSE_FIELD_UNIVERSAL_IDENTIFIERS,
  PRODUCT_COMBO_FIELD_UNIVERSAL_IDENTIFIERS,
  PRODUCT_COMBO_OBJECT_UNIVERSAL_IDENTIFIER,
  PRODUCT_COMBO_PRODUCT_TEMPLATE_REL_FIELD_UNIVERSAL_IDENTIFIERS as FIELD_IDS,
  PRODUCT_COMBO_PRODUCT_TEMPLATE_REL_OBJECT_UNIVERSAL_IDENTIFIER,
  PRODUCT_TEMPLATE_OBJECT_UNIVERSAL_IDENTIFIER,
} from 'src/product/product-universal-identifiers.constant';
import { manyToOneField } from 'src/shared/fields';

export default defineObject({
  universalIdentifier: PRODUCT_COMBO_PRODUCT_TEMPLATE_REL_OBJECT_UNIVERSAL_IDENTIFIER,
  nameSingular: 'productComboProductTemplateRel',
  namePlural: 'productComboProductTemplateRels',
  labelSingular: 'Product combo link',
  labelPlural: 'Product combo links',
  description: 'Puts a combo choice on a combo product',
  icon: 'IconLink',
  fields: [
    manyToOneField({
      universalIdentifier: FIELD_IDS.productTemplate,
      name: 'productTemplate',
      label: 'Product',
      icon: 'IconPackage',
      onDelete: OnDeleteAction.CASCADE,
      targetObjectUniversalIdentifier: PRODUCT_TEMPLATE_OBJECT_UNIVERSAL_IDENTIFIER,
      targetFieldUniversalIdentifier: PRODUCT_COMBO_INVERSE_FIELD_UNIVERSAL_IDENTIFIERS.templateCombos,
    }),
    manyToOneField({
      universalIdentifier: FIELD_IDS.productCombo,
      name: 'productCombo',
      label: 'Combo choice',
      icon: 'IconBoxMultiple',
      onDelete: OnDeleteAction.CASCADE,
      targetObjectUniversalIdentifier: PRODUCT_COMBO_OBJECT_UNIVERSAL_IDENTIFIER,
      targetFieldUniversalIdentifier: PRODUCT_COMBO_FIELD_UNIVERSAL_IDENTIFIERS.productTemplateLinks,
    }),
  ],
});
