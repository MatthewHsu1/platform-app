import { defineObject, FieldType, OnDeleteAction } from 'twenty-sdk/define';

import { APPLIED_ON, COMPUTE_PRICE, PRICELIST_BASE } from 'src/product/product-options.constant';
import {
  PRODUCT_CATEGORY_OBJECT_UNIVERSAL_IDENTIFIER,
  PRODUCT_PRICELIST_FIELD_UNIVERSAL_IDENTIFIERS,
  PRODUCT_PRICELIST_INVERSE_FIELD_UNIVERSAL_IDENTIFIERS as INVERSE_IDS,
  PRODUCT_PRICELIST_ITEM_FIELD_UNIVERSAL_IDENTIFIERS as FIELD_IDS,
  PRODUCT_PRICELIST_ITEM_OBJECT_UNIVERSAL_IDENTIFIER,
  PRODUCT_PRICELIST_OBJECT_UNIVERSAL_IDENTIFIER,
  PRODUCT_PRODUCT_OBJECT_UNIVERSAL_IDENTIFIER,
  PRODUCT_TEMPLATE_OBJECT_UNIVERSAL_IDENTIFIER,
} from 'src/product/product-universal-identifiers.constant';
import {
  appWritten,
  currencyField,
  manyToOneField,
  numberField,
  selectField,
} from 'src/shared/fields';

// The name is written by code ("All products",
// "Category: Goods", the product name), so the object carries its own name
// field. Each relation points at its inverse field on the related object.
export default defineObject({
  universalIdentifier: PRODUCT_PRICELIST_ITEM_OBJECT_UNIVERSAL_IDENTIFIER,
  nameSingular: 'productPricelistItem',
  namePlural: 'productPricelistItems',
  labelSingular: 'Pricelist rule',
  labelPlural: 'Pricelist rules',
  description: 'One price rule of a pricelist',
  icon: 'IconListCheck',
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
      universalIdentifier: FIELD_IDS.pricelist,
      name: 'pricelist',
      label: 'Pricelist',
      icon: 'IconListDetails',
      onDelete: OnDeleteAction.CASCADE,
      targetObjectUniversalIdentifier: PRODUCT_PRICELIST_OBJECT_UNIVERSAL_IDENTIFIER,
      targetFieldUniversalIdentifier: PRODUCT_PRICELIST_FIELD_UNIVERSAL_IDENTIFIERS.items,
    }),
    {
      universalIdentifier: FIELD_IDS.dateStart,
      name: 'dateStart',
      label: 'Start date',
      icon: 'IconCalendarEvent',
      type: FieldType.DATE_TIME,
    },
    {
      universalIdentifier: FIELD_IDS.dateEnd,
      name: 'dateEnd',
      label: 'End date',
      icon: 'IconCalendarDue',
      type: FieldType.DATE_TIME,
    },
    numberField(FIELD_IDS.minQuantity, 'minQuantity', 'Minimum quantity', 'IconSortAscendingNumbers', {
      decimals: 2,
      defaultValue: 0,
    }),
    selectField(FIELD_IDS.appliedOn, 'appliedOn', 'Apply on', 'IconFilter', APPLIED_ON.GLOBAL, [
      { value: APPLIED_ON.GLOBAL, label: 'All products', color: 'gray' },
      { value: APPLIED_ON.PRODUCT_CATEGORY, label: 'Product category', color: 'blue' },
      { value: APPLIED_ON.PRODUCT, label: 'Product', color: 'green' },
      { value: APPLIED_ON.PRODUCT_VARIANT, label: 'Product variant', color: 'purple' },
    ]),
    manyToOneField({
      universalIdentifier: FIELD_IDS.categ,
      name: 'categ',
      label: 'Product category',
      icon: 'IconCategory',
      onDelete: OnDeleteAction.CASCADE,
      targetObjectUniversalIdentifier: PRODUCT_CATEGORY_OBJECT_UNIVERSAL_IDENTIFIER,
      targetFieldUniversalIdentifier: INVERSE_IDS.categoryPricelistRules,
    }),
    manyToOneField({
      universalIdentifier: FIELD_IDS.productTmpl,
      name: 'productTmpl',
      label: 'Product',
      icon: 'IconPackage',
      onDelete: OnDeleteAction.CASCADE,
      targetObjectUniversalIdentifier: PRODUCT_TEMPLATE_OBJECT_UNIVERSAL_IDENTIFIER,
      targetFieldUniversalIdentifier: INVERSE_IDS.templatePricelistRules,
    }),
    manyToOneField({
      universalIdentifier: FIELD_IDS.product,
      name: 'product',
      label: 'Product variant',
      icon: 'IconBoxMultiple',
      onDelete: OnDeleteAction.CASCADE,
      targetObjectUniversalIdentifier: PRODUCT_PRODUCT_OBJECT_UNIVERSAL_IDENTIFIER,
      targetFieldUniversalIdentifier: INVERSE_IDS.variantPricelistRules,
    }),
    selectField(FIELD_IDS.base, 'base', 'Based on', 'IconFilter', PRICELIST_BASE.LIST_PRICE, [
      { value: PRICELIST_BASE.LIST_PRICE, label: 'Sales price', color: 'gray' },
      { value: PRICELIST_BASE.STANDARD_PRICE, label: 'Cost', color: 'orange' },
      { value: PRICELIST_BASE.PRICELIST, label: 'Other pricelist', color: 'blue' },
    ]),
    manyToOneField({
      universalIdentifier: FIELD_IDS.basePricelist,
      name: 'basePricelist',
      label: 'Other pricelist',
      icon: 'IconListDetails',
      onDelete: OnDeleteAction.SET_NULL,
      targetObjectUniversalIdentifier: PRODUCT_PRICELIST_OBJECT_UNIVERSAL_IDENTIFIER,
      targetFieldUniversalIdentifier: PRODUCT_PRICELIST_FIELD_UNIVERSAL_IDENTIFIERS.basedOnRules,
    }),
    selectField(FIELD_IDS.computePrice, 'computePrice', 'Price type', 'IconFilter', COMPUTE_PRICE.FIXED, [
      { value: COMPUTE_PRICE.FIXED, label: 'Fixed price', color: 'gray' },
      { value: COMPUTE_PRICE.PERCENTAGE, label: 'Discount', color: 'green' },
      { value: COMPUTE_PRICE.FORMULA, label: 'Formula', color: 'purple' },
    ]),
    currencyField(FIELD_IDS.fixedPrice, 'fixedPrice', 'Fixed price', 'IconCurrencyDollar'),
    numberField(FIELD_IDS.percentPrice, 'percentPrice', 'Discount (%)', 'IconPercentage', {
      decimals: 2,
      defaultValue: 0,
    }),
    numberField(FIELD_IDS.priceDiscount, 'priceDiscount', 'Formula discount (%)', 'IconPercentage', {
      decimals: 2,
      defaultValue: 0,
    }),
    numberField(FIELD_IDS.priceMarkup, 'priceMarkup', 'Markup (%)', 'IconPercentage', {
      decimals: 2,
      defaultValue: 0,
    }),
    currencyField(FIELD_IDS.priceRound, 'priceRound', 'Round to', 'IconRulerMeasure'),
    currencyField(FIELD_IDS.priceSurcharge, 'priceSurcharge', 'Extra fee', 'IconCoin'),
    currencyField(FIELD_IDS.priceMinMargin, 'priceMinMargin', 'Minimum margin', 'IconArrowBarToDown'),
    currencyField(FIELD_IDS.priceMaxMargin, 'priceMaxMargin', 'Maximum margin', 'IconArrowBarToUp'),
  ],
});
