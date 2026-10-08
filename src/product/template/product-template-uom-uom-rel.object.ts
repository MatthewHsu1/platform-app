import { defineObject, OnDeleteAction } from 'twenty-sdk/define';

import {
  PRODUCT_TEMPLATE_FIELD_UNIVERSAL_IDENTIFIERS,
  PRODUCT_TEMPLATE_OBJECT_UNIVERSAL_IDENTIFIER,
  PRODUCT_TEMPLATE_UOM_UOM_REL_FIELD_UNIVERSAL_IDENTIFIERS as FIELD_IDS,
  PRODUCT_TEMPLATE_UOM_UOM_REL_OBJECT_UNIVERSAL_IDENTIFIER,
} from 'src/product/product-universal-identifiers.constant';
import { manyToOneField } from 'src/shared/fields';
import {
  UOM_UOM_FIELD_UNIVERSAL_IDENTIFIERS,
  UOM_UOM_OBJECT_UNIVERSAL_IDENTIFIER,
} from 'src/uom/uom-universal-identifiers.constant';

export default defineObject({
  universalIdentifier: PRODUCT_TEMPLATE_UOM_UOM_REL_OBJECT_UNIVERSAL_IDENTIFIER,
  nameSingular: 'productTemplateUomUomRel',
  namePlural: 'productTemplateUomUomRels',
  labelSingular: 'Product packaging link',
  labelPlural: 'Product packaging links',
  description: 'Allows a unit as a packaging of a product',
  icon: 'IconLink',
  fields: [
    manyToOneField({
      universalIdentifier: FIELD_IDS.productTemplate,
      name: 'productTemplate',
      label: 'Product',
      icon: 'IconPackage',
      onDelete: OnDeleteAction.CASCADE,
      targetObjectUniversalIdentifier: PRODUCT_TEMPLATE_OBJECT_UNIVERSAL_IDENTIFIER,
      targetFieldUniversalIdentifier: PRODUCT_TEMPLATE_FIELD_UNIVERSAL_IDENTIFIERS.uoms,
    }),
    manyToOneField({
      universalIdentifier: FIELD_IDS.uomUom,
      name: 'uomUom',
      label: 'Unit',
      icon: 'IconRuler',
      onDelete: OnDeleteAction.CASCADE,
      targetObjectUniversalIdentifier: UOM_UOM_OBJECT_UNIVERSAL_IDENTIFIER,
      targetFieldUniversalIdentifier: UOM_UOM_FIELD_UNIVERSAL_IDENTIFIERS.packagingLinks,
    }),
  ],
});
