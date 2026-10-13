import { defineObject, OnDeleteAction } from 'twenty-sdk/define';

import {
  PRODUCT_CATEGORY_FIELD_UNIVERSAL_IDENTIFIERS as FIELD_IDS,
  PRODUCT_CATEGORY_OBJECT_UNIVERSAL_IDENTIFIER,
  PRODUCT_PRICELIST_INVERSE_FIELD_UNIVERSAL_IDENTIFIERS,
  PRODUCT_PRICELIST_ITEM_FIELD_UNIVERSAL_IDENTIFIERS,
  PRODUCT_PRICELIST_ITEM_OBJECT_UNIVERSAL_IDENTIFIER,
  PRODUCT_TEMPLATE_FIELD_UNIVERSAL_IDENTIFIERS,
  PRODUCT_TEMPLATE_OBJECT_UNIVERSAL_IDENTIFIER,
} from 'src/product/product-universal-identifiers.constant';
import { appTextField, manyToOneField, oneToManyField, seedKeyField } from 'src/shared/fields';

export default defineObject({
  universalIdentifier: PRODUCT_CATEGORY_OBJECT_UNIVERSAL_IDENTIFIER,
  nameSingular: 'productCategory',
  namePlural: 'productCategories',
  labelSingular: 'Product category',
  labelPlural: 'Product categories',
  description: 'A group of products, which can sit under another group',
  icon: 'IconCategory',
  fields: [
    appTextField(FIELD_IDS.completeName, 'completeName', 'Full name', 'IconAbc'),
    manyToOneField({
      universalIdentifier: FIELD_IDS.parent,
      name: 'parent',
      label: 'Parent category',
      icon: 'IconHierarchy',
      onDelete: OnDeleteAction.CASCADE,
      targetObjectUniversalIdentifier: PRODUCT_CATEGORY_OBJECT_UNIVERSAL_IDENTIFIER,
      targetFieldUniversalIdentifier: FIELD_IDS.child,
    }),
    oneToManyField({
      universalIdentifier: FIELD_IDS.child,
      name: 'child',
      label: 'Child categories',
      icon: 'IconHierarchy',
      targetObjectUniversalIdentifier: PRODUCT_CATEGORY_OBJECT_UNIVERSAL_IDENTIFIER,
      targetFieldUniversalIdentifier: FIELD_IDS.parent,
    }),
    appTextField(FIELD_IDS.parentPath, 'parentPath', 'Path', 'IconSitemap'),
    seedKeyField(FIELD_IDS.seedKey),
    oneToManyField({
      universalIdentifier: FIELD_IDS.productTemplates,
      name: 'productTemplates',
      label: 'Products',
      icon: 'IconPackage',
      targetObjectUniversalIdentifier: PRODUCT_TEMPLATE_OBJECT_UNIVERSAL_IDENTIFIER,
      targetFieldUniversalIdentifier: PRODUCT_TEMPLATE_FIELD_UNIVERSAL_IDENTIFIERS.categ,
    }),
    oneToManyField({
      universalIdentifier: PRODUCT_PRICELIST_INVERSE_FIELD_UNIVERSAL_IDENTIFIERS.categoryPricelistRules,
      name: 'pricelistRules',
      label: 'Pricelist rules',
      icon: 'IconListCheck',
      targetObjectUniversalIdentifier: PRODUCT_PRICELIST_ITEM_OBJECT_UNIVERSAL_IDENTIFIER,
      targetFieldUniversalIdentifier: PRODUCT_PRICELIST_ITEM_FIELD_UNIVERSAL_IDENTIFIERS.categ,
    }),
  ],
});
