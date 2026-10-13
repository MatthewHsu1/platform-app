import { defineObject, FieldType, OnDeleteAction, STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS } from 'twenty-sdk/define';

import {
  PRODUCT_PRICELIST_INVERSE_FIELD_UNIVERSAL_IDENTIFIERS as INVERSE_IDS,
  PRODUCT_PRODUCT_OBJECT_UNIVERSAL_IDENTIFIER,
  PRODUCT_SUPPLIERINFO_FIELD_UNIVERSAL_IDENTIFIERS as FIELD_IDS,
  PRODUCT_SUPPLIERINFO_OBJECT_UNIVERSAL_IDENTIFIER,
  PRODUCT_TEMPLATE_OBJECT_UNIVERSAL_IDENTIFIER,
} from 'src/product/product-universal-identifiers.constant';
import {
  appWritten,
  currencyField,
  manyToOneField,
  numberField,
  textField,
} from 'src/shared/fields';
import {
  UOM_UOM_FIELD_UNIVERSAL_IDENTIFIERS,
  UOM_UOM_OBJECT_UNIVERSAL_IDENTIFIER,
} from 'src/uom/uom-universal-identifiers.constant';

// Vendors are companies. The name ("Vendor –
// product") is written by code, so the object carries its own name field.
export default defineObject({
  universalIdentifier: PRODUCT_SUPPLIERINFO_OBJECT_UNIVERSAL_IDENTIFIER,
  nameSingular: 'productSupplierinfo',
  namePlural: 'productSupplierinfos',
  labelSingular: 'Vendor price',
  labelPlural: 'Vendor prices',
  description: 'What a vendor charges for a product',
  icon: 'IconTruckDelivery',
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
      universalIdentifier: FIELD_IDS.partner,
      name: 'partner',
      label: 'Vendor',
      icon: 'IconBuildingSkyscraper',
      onDelete: OnDeleteAction.CASCADE,
      targetObjectUniversalIdentifier:
        STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.company.universalIdentifier,
      targetFieldUniversalIdentifier: INVERSE_IDS.companyProductSupplierinfos,
    }),
    textField(FIELD_IDS.productName, 'productName', 'Vendor product name', 'IconAbc'),
    textField(FIELD_IDS.productCode, 'productCode', 'Vendor product code', 'IconHash'),
    numberField(FIELD_IDS.sequence, 'sequence', 'Sequence', 'IconArrowsSort', {
      decimals: 0,
      int: true,
      defaultValue: 1,
    }),
    manyToOneField({
      universalIdentifier: FIELD_IDS.productUom,
      name: 'productUom',
      label: 'Unit',
      icon: 'IconRuler',
      onDelete: OnDeleteAction.SET_NULL,
      targetObjectUniversalIdentifier: UOM_UOM_OBJECT_UNIVERSAL_IDENTIFIER,
      targetFieldUniversalIdentifier: UOM_UOM_FIELD_UNIVERSAL_IDENTIFIERS.supplierinfos,
    }),
    numberField(FIELD_IDS.minQty, 'minQty', 'Minimum quantity', 'IconSortAscendingNumbers', {
      decimals: 2,
      defaultValue: 0,
    }),
    currencyField(FIELD_IDS.price, 'price', 'Unit price', 'IconCurrencyDollar'),
    numberField(FIELD_IDS.discount, 'discount', 'Discount (%)', 'IconPercentage', { decimals: 2 }),
    {
      universalIdentifier: FIELD_IDS.dateStart,
      name: 'dateStart',
      label: 'Start date',
      icon: 'IconCalendarEvent',
      type: FieldType.DATE,
    },
    {
      universalIdentifier: FIELD_IDS.dateEnd,
      name: 'dateEnd',
      label: 'End date',
      icon: 'IconCalendarDue',
      type: FieldType.DATE,
    },
    manyToOneField({
      universalIdentifier: FIELD_IDS.productTmpl,
      name: 'productTmpl',
      label: 'Product',
      icon: 'IconPackage',
      onDelete: OnDeleteAction.CASCADE,
      targetObjectUniversalIdentifier: PRODUCT_TEMPLATE_OBJECT_UNIVERSAL_IDENTIFIER,
      targetFieldUniversalIdentifier: INVERSE_IDS.templateSellers,
    }),
    manyToOneField({
      universalIdentifier: FIELD_IDS.product,
      name: 'product',
      label: 'Product variant',
      icon: 'IconBoxMultiple',
      onDelete: OnDeleteAction.CASCADE,
      targetObjectUniversalIdentifier: PRODUCT_PRODUCT_OBJECT_UNIVERSAL_IDENTIFIER,
      targetFieldUniversalIdentifier: INVERSE_IDS.variantSellers,
    }),
    numberField(FIELD_IDS.delay, 'delay', 'Lead time (days)', 'IconClock', {
      decimals: 0,
      int: true,
      defaultValue: 1,
    }),
  ],
});
