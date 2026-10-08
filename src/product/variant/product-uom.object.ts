import { defineObject, FieldType, OnDeleteAction } from 'twenty-sdk/define';

import {
  PRODUCT_PRODUCT_FIELD_UNIVERSAL_IDENTIFIERS,
  PRODUCT_PRODUCT_OBJECT_UNIVERSAL_IDENTIFIER,
  PRODUCT_UOM_FIELD_UNIVERSAL_IDENTIFIERS as FIELD_IDS,
  PRODUCT_UOM_OBJECT_UNIVERSAL_IDENTIFIER,
} from 'src/product/product-universal-identifiers.constant';
import { manyToOneField } from 'src/shared/fields';
import {
  UOM_UOM_FIELD_UNIVERSAL_IDENTIFIERS,
  UOM_UOM_OBJECT_UNIVERSAL_IDENTIFIER,
} from 'src/uom/uom-universal-identifiers.constant';

export default defineObject({
  universalIdentifier: PRODUCT_UOM_OBJECT_UNIVERSAL_IDENTIFIER,
  nameSingular: 'productUom',
  namePlural: 'productUoms',
  labelSingular: 'Packaging barcode',
  labelPlural: 'Packaging barcodes',
  description: 'The barcode of a variant sold in a packaging unit',
  icon: 'IconBarcode',
  labelIdentifierFieldMetadataUniversalIdentifier: FIELD_IDS.barcode,
  fields: [
    {
      universalIdentifier: FIELD_IDS.barcode,
      name: 'barcode',
      label: 'Barcode',
      icon: 'IconBarcode',
      type: FieldType.TEXT,
    },
    manyToOneField({
      universalIdentifier: FIELD_IDS.uom,
      name: 'uom',
      label: 'Unit',
      icon: 'IconRuler',
      onDelete: OnDeleteAction.CASCADE,
      targetObjectUniversalIdentifier: UOM_UOM_OBJECT_UNIVERSAL_IDENTIFIER,
      targetFieldUniversalIdentifier: UOM_UOM_FIELD_UNIVERSAL_IDENTIFIERS.productUoms,
    }),
    manyToOneField({
      universalIdentifier: FIELD_IDS.product,
      name: 'product',
      label: 'Product variant',
      icon: 'IconBoxMultiple',
      onDelete: OnDeleteAction.CASCADE,
      targetObjectUniversalIdentifier: PRODUCT_PRODUCT_OBJECT_UNIVERSAL_IDENTIFIER,
      targetFieldUniversalIdentifier: PRODUCT_PRODUCT_FIELD_UNIVERSAL_IDENTIFIERS.productUoms,
    }),
  ],
});
