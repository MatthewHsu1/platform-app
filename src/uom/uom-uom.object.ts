import { defineObject, MetadataWritability, OnDeleteAction } from 'twenty-sdk/define';

import {
  PRODUCT_SUPPLIERINFO_FIELD_UNIVERSAL_IDENTIFIERS,
  PRODUCT_SUPPLIERINFO_OBJECT_UNIVERSAL_IDENTIFIER,
  PRODUCT_TEMPLATE_FIELD_UNIVERSAL_IDENTIFIERS,
  PRODUCT_TEMPLATE_OBJECT_UNIVERSAL_IDENTIFIER,
  PRODUCT_TEMPLATE_UOM_UOM_REL_FIELD_UNIVERSAL_IDENTIFIERS,
  PRODUCT_TEMPLATE_UOM_UOM_REL_OBJECT_UNIVERSAL_IDENTIFIER,
  PRODUCT_UOM_FIELD_UNIVERSAL_IDENTIFIERS,
  PRODUCT_UOM_OBJECT_UNIVERSAL_IDENTIFIER,
} from 'src/product/product-universal-identifiers.constant';
import {
  UOM_UOM_FIELD_UNIVERSAL_IDENTIFIERS as FIELD_IDS,
  UOM_UOM_OBJECT_UNIVERSAL_IDENTIFIER,
} from 'src/uom/uom-universal-identifiers.constant';
import {
  activeField,
  appTextField,
  manyToOneField,
  numberField,
  oneToManyField,
  seedKeyField,
} from 'src/shared/fields';

export default defineObject({
  universalIdentifier: UOM_UOM_OBJECT_UNIVERSAL_IDENTIFIER,
  nameSingular: 'uomUom',
  namePlural: 'uomUoms',
  labelSingular: 'Unit of measure',
  labelPlural: 'Units of measure',
  description: 'A unit and how many of its reference unit it holds',
  icon: 'IconRuler',
  fields: [
    manyToOneField({
      universalIdentifier: FIELD_IDS.relativeUom,
      name: 'relativeUom',
      label: 'Reference unit',
      icon: 'IconHierarchy',
      onDelete: OnDeleteAction.CASCADE,
      targetObjectUniversalIdentifier: UOM_UOM_OBJECT_UNIVERSAL_IDENTIFIER,
      targetFieldUniversalIdentifier: FIELD_IDS.relatedUoms,
    }),
    oneToManyField({
      universalIdentifier: FIELD_IDS.relatedUoms,
      name: 'relatedUoms',
      label: 'Related units',
      icon: 'IconHierarchy',
      targetObjectUniversalIdentifier: UOM_UOM_OBJECT_UNIVERSAL_IDENTIFIER,
      targetFieldUniversalIdentifier: FIELD_IDS.relativeUom,
    }),
    {
      ...numberField(FIELD_IDS.relativeFactor, 'relativeFactor', 'Contains', 'IconX', { decimals: 6 }),
      defaultValue: 1,
      isNullable: false,
    },
    {
      ...numberField(FIELD_IDS.factor, 'factor', 'Absolute quantity', 'IconMathXy', { decimals: 6 }),
      writability: MetadataWritability.APPLICATION,
      isUIEditable: false,
    },
    numberField(FIELD_IDS.sequence, 'sequence', 'Sequence', 'IconArrowsSort', { decimals: 0, int: true }),
    activeField(FIELD_IDS.active),
    appTextField(FIELD_IDS.parentPath, 'parentPath', 'Path', 'IconSitemap'),
    seedKeyField(FIELD_IDS.seedKey),
    oneToManyField({
      universalIdentifier: FIELD_IDS.productTemplates,
      name: 'productTemplates',
      label: 'Products',
      icon: 'IconPackage',
      targetObjectUniversalIdentifier: PRODUCT_TEMPLATE_OBJECT_UNIVERSAL_IDENTIFIER,
      targetFieldUniversalIdentifier: PRODUCT_TEMPLATE_FIELD_UNIVERSAL_IDENTIFIERS.uom,
    }),
    oneToManyField({
      universalIdentifier: FIELD_IDS.packagingLinks,
      name: 'packagingLinks',
      label: 'Packaging links',
      icon: 'IconLink',
      targetObjectUniversalIdentifier: PRODUCT_TEMPLATE_UOM_UOM_REL_OBJECT_UNIVERSAL_IDENTIFIER,
      targetFieldUniversalIdentifier:
        PRODUCT_TEMPLATE_UOM_UOM_REL_FIELD_UNIVERSAL_IDENTIFIERS.uomUom,
    }),
    oneToManyField({
      universalIdentifier: FIELD_IDS.productUoms,
      name: 'productUoms',
      label: 'Packaging barcodes',
      icon: 'IconBarcode',
      targetObjectUniversalIdentifier: PRODUCT_UOM_OBJECT_UNIVERSAL_IDENTIFIER,
      targetFieldUniversalIdentifier: PRODUCT_UOM_FIELD_UNIVERSAL_IDENTIFIERS.uom,
    }),
    oneToManyField({
      universalIdentifier: FIELD_IDS.supplierinfos,
      name: 'supplierinfos',
      label: 'Vendor prices',
      icon: 'IconTruckDelivery',
      targetObjectUniversalIdentifier: PRODUCT_SUPPLIERINFO_OBJECT_UNIVERSAL_IDENTIFIER,
      targetFieldUniversalIdentifier: PRODUCT_SUPPLIERINFO_FIELD_UNIVERSAL_IDENTIFIERS.productUom,
    }),
  ],
});
