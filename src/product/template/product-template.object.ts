import { defineObject, FieldType, OnDeleteAction } from 'twenty-sdk/define';

import { PRODUCT_TYPE } from 'src/product/product-options.constant';
import {
  PRODUCT_CATEGORY_FIELD_UNIVERSAL_IDENTIFIERS,
  PRODUCT_CATEGORY_OBJECT_UNIVERSAL_IDENTIFIER,
  PRODUCT_COMBO_INVERSE_FIELD_UNIVERSAL_IDENTIFIERS,
  PRODUCT_COMBO_PRODUCT_TEMPLATE_REL_FIELD_UNIVERSAL_IDENTIFIERS,
  PRODUCT_COMBO_PRODUCT_TEMPLATE_REL_OBJECT_UNIVERSAL_IDENTIFIER,
  PRODUCT_PRICELIST_INVERSE_FIELD_UNIVERSAL_IDENTIFIERS as PRICING_INVERSE_IDS,
  PRODUCT_PRICELIST_ITEM_FIELD_UNIVERSAL_IDENTIFIERS,
  PRODUCT_PRICELIST_ITEM_OBJECT_UNIVERSAL_IDENTIFIER,
  PRODUCT_PRODUCT_FIELD_UNIVERSAL_IDENTIFIERS,
  PRODUCT_PRODUCT_OBJECT_UNIVERSAL_IDENTIFIER,
  PRODUCT_SUPPLIERINFO_FIELD_UNIVERSAL_IDENTIFIERS,
  PRODUCT_SUPPLIERINFO_OBJECT_UNIVERSAL_IDENTIFIER,
  PRODUCT_TAG_PRODUCT_TEMPLATE_REL_FIELD_UNIVERSAL_IDENTIFIERS,
  PRODUCT_TAG_PRODUCT_TEMPLATE_REL_OBJECT_UNIVERSAL_IDENTIFIER,
  PRODUCT_TEMPLATE_ATTRIBUTE_EXCLUSION_FIELD_UNIVERSAL_IDENTIFIERS,
  PRODUCT_TEMPLATE_ATTRIBUTE_EXCLUSION_OBJECT_UNIVERSAL_IDENTIFIER,
  PRODUCT_TEMPLATE_ATTRIBUTE_FIELD_UNIVERSAL_IDENTIFIERS as ATTRIBUTE_FIELD_IDS,
  PRODUCT_TEMPLATE_ATTRIBUTE_LINE_FIELD_UNIVERSAL_IDENTIFIERS,
  PRODUCT_TEMPLATE_ATTRIBUTE_LINE_OBJECT_UNIVERSAL_IDENTIFIER,
  PRODUCT_TEMPLATE_ATTRIBUTE_VALUE_FIELD_UNIVERSAL_IDENTIFIERS,
  PRODUCT_TEMPLATE_ATTRIBUTE_VALUE_OBJECT_UNIVERSAL_IDENTIFIER,
  PRODUCT_TEMPLATE_FIELD_UNIVERSAL_IDENTIFIERS as FIELD_IDS,
  PRODUCT_TEMPLATE_OBJECT_UNIVERSAL_IDENTIFIER,
  PRODUCT_TEMPLATE_UOM_UOM_REL_FIELD_UNIVERSAL_IDENTIFIERS,
  PRODUCT_TEMPLATE_UOM_UOM_REL_OBJECT_UNIVERSAL_IDENTIFIER,
} from 'src/product/product-universal-identifiers.constant';
import {
  booleanField,
  currencyField,
  filesField,
  manyToOneField,
  numberField,
  oneToManyField,
  selectField,
  textField,
} from 'src/shared/fields';
import {
  UOM_UOM_FIELD_UNIVERSAL_IDENTIFIERS,
  UOM_UOM_OBJECT_UNIVERSAL_IDENTIFIER,
} from 'src/uom/uom-universal-identifiers.constant';

// `productType` stands in for `type`, which Twenty
// reserves. The name is Twenty's own name field.
export default defineObject({
  universalIdentifier: PRODUCT_TEMPLATE_OBJECT_UNIVERSAL_IDENTIFIER,
  nameSingular: 'productTemplate',
  namePlural: 'productTemplates',
  labelSingular: 'Product',
  labelPlural: 'Products',
  description: 'Something the company sells or buys, with its variants',
  icon: 'IconPackage',
  imageIdentifierFieldMetadataUniversalIdentifier: FIELD_IDS.image,
  fields: [
    numberField(FIELD_IDS.sequence, 'sequence', 'Sequence', 'IconArrowsSort', {
      decimals: 0,
      int: true,
      defaultValue: 1,
    }),
    {
      universalIdentifier: FIELD_IDS.description,
      name: 'description',
      label: 'Description',
      icon: 'IconNotes',
      type: FieldType.RICH_TEXT,
    },
    textField(FIELD_IDS.descriptionSale, 'descriptionSale', 'Sales description', 'IconAlignLeft'),
    textField(FIELD_IDS.descriptionPurchase, 'descriptionPurchase', 'Purchase description', 'IconAlignLeft'),
    selectField(FIELD_IDS.productType, 'productType', 'Product type', 'IconFilter', PRODUCT_TYPE.CONSU, [
      { value: PRODUCT_TYPE.CONSU, label: 'Goods', color: 'gray' },
      { value: PRODUCT_TYPE.SERVICE, label: 'Service', color: 'blue' },
      { value: PRODUCT_TYPE.COMBO, label: 'Combo', color: 'purple' },
    ]),
    manyToOneField({
      universalIdentifier: FIELD_IDS.categ,
      name: 'categ',
      label: 'Product category',
      icon: 'IconCategory',
      onDelete: OnDeleteAction.SET_NULL,
      targetObjectUniversalIdentifier: PRODUCT_CATEGORY_OBJECT_UNIVERSAL_IDENTIFIER,
      targetFieldUniversalIdentifier: PRODUCT_CATEGORY_FIELD_UNIVERSAL_IDENTIFIERS.productTemplates,
    }),
    currencyField(FIELD_IDS.listPrice, 'listPrice', 'Sales price', 'IconCurrencyDollar', 1),
    currencyField(FIELD_IDS.standardPrice, 'standardPrice', 'Cost', 'IconCoin'),
    textField(FIELD_IDS.defaultCode, 'defaultCode', 'Internal reference', 'IconHash'),
    textField(FIELD_IDS.barcode, 'barcode', 'Barcode', 'IconBarcode'),
    numberField(FIELD_IDS.weight, 'weight', 'Weight', 'IconWeight', { decimals: 2 }),
    numberField(FIELD_IDS.volume, 'volume', 'Volume', 'IconCube', { decimals: 2 }),
    booleanField(FIELD_IDS.saleOk, 'saleOk', 'Can be sold', 'IconShoppingCart', true),
    booleanField(FIELD_IDS.purchaseOk, 'purchaseOk', 'Can be purchased', 'IconShoppingBag', true),
    manyToOneField({
      universalIdentifier: FIELD_IDS.uom,
      name: 'uom',
      label: 'Unit',
      icon: 'IconRuler',
      onDelete: OnDeleteAction.RESTRICT,
      targetObjectUniversalIdentifier: UOM_UOM_OBJECT_UNIVERSAL_IDENTIFIER,
      targetFieldUniversalIdentifier: UOM_UOM_FIELD_UNIVERSAL_IDENTIFIERS.productTemplates,
    }),
    oneToManyField({
      universalIdentifier: FIELD_IDS.uoms,
      name: 'uoms',
      label: 'Packagings',
      icon: 'IconPackages',
      targetObjectUniversalIdentifier: PRODUCT_TEMPLATE_UOM_UOM_REL_OBJECT_UNIVERSAL_IDENTIFIER,
      targetFieldUniversalIdentifier:
        PRODUCT_TEMPLATE_UOM_UOM_REL_FIELD_UNIVERSAL_IDENTIFIERS.productTemplate,
      junctionTargetFieldUniversalIdentifier:
        PRODUCT_TEMPLATE_UOM_UOM_REL_FIELD_UNIVERSAL_IDENTIFIERS.uomUom,
    }),
    oneToManyField({
      universalIdentifier: FIELD_IDS.tags,
      name: 'tags',
      label: 'Tags',
      icon: 'IconTags',
      targetObjectUniversalIdentifier: PRODUCT_TAG_PRODUCT_TEMPLATE_REL_OBJECT_UNIVERSAL_IDENTIFIER,
      targetFieldUniversalIdentifier:
        PRODUCT_TAG_PRODUCT_TEMPLATE_REL_FIELD_UNIVERSAL_IDENTIFIERS.productTemplate,
      junctionTargetFieldUniversalIdentifier:
        PRODUCT_TAG_PRODUCT_TEMPLATE_REL_FIELD_UNIVERSAL_IDENTIFIERS.productTag,
    }),
    booleanField(FIELD_IDS.active, 'active', 'Active', 'IconCircleCheck', true),
    booleanField(FIELD_IDS.isFavorite, 'isFavorite', 'Favorite', 'IconStar', false),
    filesField(FIELD_IDS.image, 'image', 'Image', 'IconPhoto'),
    oneToManyField({
      universalIdentifier: FIELD_IDS.productVariants,
      name: 'productVariants',
      label: 'Variants',
      icon: 'IconBoxMultiple',
      targetObjectUniversalIdentifier: PRODUCT_PRODUCT_OBJECT_UNIVERSAL_IDENTIFIER,
      targetFieldUniversalIdentifier: PRODUCT_PRODUCT_FIELD_UNIVERSAL_IDENTIFIERS.productTmpl,
    }),
    oneToManyField({
      universalIdentifier: ATTRIBUTE_FIELD_IDS.attributeLines,
      name: 'attributeLines',
      label: 'Attributes',
      icon: 'IconAdjustments',
      targetObjectUniversalIdentifier: PRODUCT_TEMPLATE_ATTRIBUTE_LINE_OBJECT_UNIVERSAL_IDENTIFIER,
      targetFieldUniversalIdentifier:
        PRODUCT_TEMPLATE_ATTRIBUTE_LINE_FIELD_UNIVERSAL_IDENTIFIERS.productTmpl,
    }),
    oneToManyField({
      universalIdentifier: ATTRIBUTE_FIELD_IDS.exclusions,
      name: 'exclusions',
      label: 'Exclusions',
      icon: 'IconBan',
      targetObjectUniversalIdentifier: PRODUCT_TEMPLATE_ATTRIBUTE_EXCLUSION_OBJECT_UNIVERSAL_IDENTIFIER,
      targetFieldUniversalIdentifier:
        PRODUCT_TEMPLATE_ATTRIBUTE_EXCLUSION_FIELD_UNIVERSAL_IDENTIFIERS.productTmpl,
    }),
    oneToManyField({
      universalIdentifier: ATTRIBUTE_FIELD_IDS.attributeValues,
      name: 'attributeValues',
      label: 'Attribute values',
      icon: 'IconListDetails',
      targetObjectUniversalIdentifier: PRODUCT_TEMPLATE_ATTRIBUTE_VALUE_OBJECT_UNIVERSAL_IDENTIFIER,
      targetFieldUniversalIdentifier:
        PRODUCT_TEMPLATE_ATTRIBUTE_VALUE_FIELD_UNIVERSAL_IDENTIFIERS.productTmpl,
    }),
    oneToManyField({
      universalIdentifier: PRICING_INVERSE_IDS.templatePricelistRules,
      name: 'pricelistRules',
      label: 'Pricelist rules',
      icon: 'IconListCheck',
      targetObjectUniversalIdentifier: PRODUCT_PRICELIST_ITEM_OBJECT_UNIVERSAL_IDENTIFIER,
      targetFieldUniversalIdentifier: PRODUCT_PRICELIST_ITEM_FIELD_UNIVERSAL_IDENTIFIERS.productTmpl,
    }),
    oneToManyField({
      universalIdentifier: PRICING_INVERSE_IDS.templateSellers,
      name: 'sellers',
      label: 'Vendor prices',
      icon: 'IconTruckDelivery',
      targetObjectUniversalIdentifier: PRODUCT_SUPPLIERINFO_OBJECT_UNIVERSAL_IDENTIFIER,
      targetFieldUniversalIdentifier: PRODUCT_SUPPLIERINFO_FIELD_UNIVERSAL_IDENTIFIERS.productTmpl,
    }),
    oneToManyField({
      universalIdentifier: PRODUCT_COMBO_INVERSE_FIELD_UNIVERSAL_IDENTIFIERS.templateCombos,
      name: 'combos',
      label: 'Combo choices',
      icon: 'IconBoxMultiple',
      targetObjectUniversalIdentifier: PRODUCT_COMBO_PRODUCT_TEMPLATE_REL_OBJECT_UNIVERSAL_IDENTIFIER,
      targetFieldUniversalIdentifier:
        PRODUCT_COMBO_PRODUCT_TEMPLATE_REL_FIELD_UNIVERSAL_IDENTIFIERS.productTemplate,
      junctionTargetFieldUniversalIdentifier:
        PRODUCT_COMBO_PRODUCT_TEMPLATE_REL_FIELD_UNIVERSAL_IDENTIFIERS.productCombo,
    }),
  ],
});
