import {
  PRODUCT_ATTRIBUTE_CUSTOM_VALUE_OBJECT_UNIVERSAL_IDENTIFIER,
  PRODUCT_ATTRIBUTE_OBJECT_UNIVERSAL_IDENTIFIER,
  PRODUCT_ATTRIBUTE_VALUE_OBJECT_UNIVERSAL_IDENTIFIER,
  PRODUCT_CATEGORY_OBJECT_UNIVERSAL_IDENTIFIER,
  PRODUCT_COMBO_ITEM_OBJECT_UNIVERSAL_IDENTIFIER,
  PRODUCT_COMBO_OBJECT_UNIVERSAL_IDENTIFIER,
  PRODUCT_PRICELIST_ITEM_OBJECT_UNIVERSAL_IDENTIFIER,
  PRODUCT_PRICELIST_OBJECT_UNIVERSAL_IDENTIFIER,
  PRODUCT_PRODUCT_OBJECT_UNIVERSAL_IDENTIFIER,
  PRODUCT_SUPPLIERINFO_OBJECT_UNIVERSAL_IDENTIFIER,
  PRODUCT_TAG_OBJECT_UNIVERSAL_IDENTIFIER,
  PRODUCT_TEMPLATE_ATTRIBUTE_EXCLUSION_OBJECT_UNIVERSAL_IDENTIFIER,
  PRODUCT_TEMPLATE_ATTRIBUTE_LINE_OBJECT_UNIVERSAL_IDENTIFIER,
  PRODUCT_TEMPLATE_OBJECT_UNIVERSAL_IDENTIFIER,
  PRODUCT_UOM_OBJECT_UNIVERSAL_IDENTIFIER,
} from 'src/product/product-universal-identifiers.constant';
import {
  type ModuleInstallSpec,
  type ValidationRuleSpec,
} from 'src/shared/install/install-spec.type';

const requiredRelation = (
  objectUniversalIdentifier: string,
  ruleName: string,
  relation: string,
  label: string,
): ValidationRuleSpec => ({
  objectUniversalIdentifier,
  name: `platform-${ruleName}-${relation}-required`,
  expression: `isDefined(${relation})`,
  message: `${label} is required.`,
});

const requiredText = (
  objectUniversalIdentifier: string,
  ruleName: string,
  label: string,
  field = 'name',
): ValidationRuleSpec => ({
  objectUniversalIdentifier,
  name: `platform-${ruleName}-${field}-required`,
  expression: `isNonEmptyString(${field})`,
  message: `${label} is required.`,
});

// Default categories.
export const PRODUCT_INSTALL: ModuleInstallSpec = {
  firstVersion: '2.2.0',
  staffLists: [],
  defaultRows: [],
  seedRows: [
    {
      objectUniversalIdentifier: PRODUCT_CATEGORY_OBJECT_UNIVERSAL_IDENTIFIER,
      rows: [
        { seedKey: 'product.product_category_goods', values: { name: 'Goods' } },
        { seedKey: 'product.product_category_expenses', values: { name: 'Expenses' } },
        { seedKey: 'product.product_category_services', values: { name: 'Services' } },
      ],
    },
  ],
  boards: [],
  validationRules: [
    {
      objectUniversalIdentifier: PRODUCT_PRICELIST_ITEM_OBJECT_UNIVERSAL_IDENTIFIER,
      name: 'platform-pricelist-item-margins',
      expression: 'priceMinMargin.amountMicros <= priceMaxMargin.amountMicros',
      message: 'The minimum margin cannot be more than the maximum margin.',
    },
    {
      objectUniversalIdentifier: PRODUCT_PRICELIST_ITEM_OBJECT_UNIVERSAL_IDENTIFIER,
      name: 'platform-pricelist-item-dates',
      expression: 'not isDefined(dateStart) or not isDefined(dateEnd) or dateStart < dateEnd',
      message: 'The end date must be after the start date.',
    },
    {
      objectUniversalIdentifier: PRODUCT_PRICELIST_ITEM_OBJECT_UNIVERSAL_IDENTIFIER,
      name: 'platform-pricelist-item-base-pricelist',
      expression: 'base != "PRICELIST" or isDefined(basePricelist)',
      message: 'Pick the other pricelist this rule is based on.',
    },
    {
      objectUniversalIdentifier: PRODUCT_PRICELIST_ITEM_OBJECT_UNIVERSAL_IDENTIFIER,
      name: 'platform-pricelist-item-target',
      expression:
        '(appliedOn != "PRODUCT_CATEGORY" or isDefined(categ)) and (appliedOn != "PRODUCT" or isDefined(productTmpl) or isDefined(product)) and (appliedOn != "PRODUCT_VARIANT" or isDefined(product))',
      message: 'Pick the category, product or variant this rule applies to.',
    },
    {
      objectUniversalIdentifier: PRODUCT_SUPPLIERINFO_OBJECT_UNIVERSAL_IDENTIFIER,
      name: 'platform-supplierinfo-product',
      expression: 'isDefined(product) or isDefined(productTmpl)',
      message: 'Pick the product this vendor price is for.',
    },
    {
      objectUniversalIdentifier: PRODUCT_ATTRIBUTE_OBJECT_UNIVERSAL_IDENTIFIER,
      name: 'platform-attribute-multi-never',
      expression: 'displayType != "MULTI" or createVariant == "NO_VARIANT"',
      message:
        'A multi-checkbox attribute never makes variants: set its variant creation to Never.',
    },
    requiredText(PRODUCT_TEMPLATE_OBJECT_UNIVERSAL_IDENTIFIER, 'product', 'Name'),
    requiredText(PRODUCT_CATEGORY_OBJECT_UNIVERSAL_IDENTIFIER, 'category', 'Name'),
    requiredText(PRODUCT_TAG_OBJECT_UNIVERSAL_IDENTIFIER, 'tag', 'Name'),
    requiredText(PRODUCT_ATTRIBUTE_OBJECT_UNIVERSAL_IDENTIFIER, 'attribute', 'Name'),
    requiredText(PRODUCT_ATTRIBUTE_VALUE_OBJECT_UNIVERSAL_IDENTIFIER, 'attribute-value', 'Value'),
    requiredText(PRODUCT_PRICELIST_OBJECT_UNIVERSAL_IDENTIFIER, 'pricelist', 'Name'),
    requiredText(PRODUCT_COMBO_OBJECT_UNIVERSAL_IDENTIFIER, 'combo', 'Name'),
    requiredText(PRODUCT_UOM_OBJECT_UNIVERSAL_IDENTIFIER, 'packaging', 'Barcode', 'barcode'),
    requiredRelation(
      PRODUCT_PRODUCT_OBJECT_UNIVERSAL_IDENTIFIER,
      'variant',
      'productTmpl',
      'Product',
    ),
    requiredRelation(
      PRODUCT_TEMPLATE_ATTRIBUTE_LINE_OBJECT_UNIVERSAL_IDENTIFIER,
      'attribute-line',
      'productTmpl',
      'Product',
    ),
    requiredRelation(
      PRODUCT_TEMPLATE_ATTRIBUTE_LINE_OBJECT_UNIVERSAL_IDENTIFIER,
      'attribute-line',
      'attribute',
      'Attribute',
    ),
    requiredRelation(
      PRODUCT_ATTRIBUTE_VALUE_OBJECT_UNIVERSAL_IDENTIFIER,
      'attribute-value',
      'attribute',
      'Attribute',
    ),
    requiredRelation(
      PRODUCT_TEMPLATE_ATTRIBUTE_EXCLUSION_OBJECT_UNIVERSAL_IDENTIFIER,
      'exclusion',
      'productTmpl',
      'Product',
    ),
    requiredRelation(PRODUCT_UOM_OBJECT_UNIVERSAL_IDENTIFIER, 'packaging', 'uom', 'Unit'),
    requiredRelation(
      PRODUCT_UOM_OBJECT_UNIVERSAL_IDENTIFIER,
      'packaging',
      'product',
      'Product variant',
    ),
    requiredRelation(
      PRODUCT_SUPPLIERINFO_OBJECT_UNIVERSAL_IDENTIFIER,
      'supplierinfo',
      'partner',
      'Vendor',
    ),
    requiredRelation(
      PRODUCT_PRICELIST_ITEM_OBJECT_UNIVERSAL_IDENTIFIER,
      'pricelist-item',
      'pricelist',
      'Pricelist',
    ),
    requiredRelation(
      PRODUCT_COMBO_ITEM_OBJECT_UNIVERSAL_IDENTIFIER,
      'combo-item',
      'combo',
      'Combo choice',
    ),
    requiredRelation(
      PRODUCT_COMBO_ITEM_OBJECT_UNIVERSAL_IDENTIFIER,
      'combo-item',
      'product',
      'Product variant',
    ),
    requiredRelation(
      PRODUCT_ATTRIBUTE_CUSTOM_VALUE_OBJECT_UNIVERSAL_IDENTIFIER,
      'custom-value',
      'customProductTemplateAttributeValue',
      'Attribute value',
    ),
  ],
};
