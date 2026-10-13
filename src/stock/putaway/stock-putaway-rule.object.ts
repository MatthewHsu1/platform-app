import { defineObject, FieldType, OnDeleteAction } from 'twenty-sdk/define';

import {
  PRODUCT_CATEGORY_OBJECT_UNIVERSAL_IDENTIFIER,
  PRODUCT_PRODUCT_OBJECT_UNIVERSAL_IDENTIFIER,
} from 'src/product/product-universal-identifiers.constant';
import { activeField, appWritten, manyToOneField, numberField, oneToManyField, selectField } from 'src/shared/fields';
import {
  ROUTING_INVERSE_FIELD_UNIVERSAL_IDENTIFIERS as FOREIGN_IDS,
  STOCK_PACKAGE_TYPE_STOCK_PUTAWAY_RULE_REL_FIELD_UNIVERSAL_IDENTIFIERS,
  STOCK_PACKAGE_TYPE_STOCK_PUTAWAY_RULE_REL_OBJECT_UNIVERSAL_IDENTIFIER,
  STOCK_PUTAWAY_RULE_FIELD_UNIVERSAL_IDENTIFIERS as FIELD_IDS,
  STOCK_PUTAWAY_RULE_OBJECT_UNIVERSAL_IDENTIFIER,
  STOCK_STORAGE_CATEGORY_FIELD_UNIVERSAL_IDENTIFIERS,
  STOCK_STORAGE_CATEGORY_OBJECT_UNIVERSAL_IDENTIFIER,
} from 'src/stock/routing-universal-identifiers.constant';
import { STOCK_LOCATION_OBJECT_UNIVERSAL_IDENTIFIER } from 'src/stock/stock-universal-identifiers.constant';

// Applied in order of `sequence`, then product.
export default defineObject({
  universalIdentifier: STOCK_PUTAWAY_RULE_OBJECT_UNIVERSAL_IDENTIFIER,
  nameSingular: 'stockPutawayRule',
  namePlural: 'stockPutawayRules',
  labelSingular: 'Putaway rule',
  labelPlural: 'Putaway rules',
  description: 'Where products arriving in a location are stored',
  icon: 'IconArrowBarToDown',
  labelIdentifierFieldMetadataUniversalIdentifier: FIELD_IDS.name,
  fields: [
    appWritten({ universalIdentifier: FIELD_IDS.name, name: 'name', label: 'Name', icon: 'IconAbc', type: FieldType.TEXT }),
    manyToOneField({
      universalIdentifier: FIELD_IDS.product,
      name: 'product',
      label: 'Product',
      icon: 'IconBoxMultiple',
      onDelete: OnDeleteAction.CASCADE,
      targetObjectUniversalIdentifier: PRODUCT_PRODUCT_OBJECT_UNIVERSAL_IDENTIFIER,
      targetFieldUniversalIdentifier: FOREIGN_IDS.productProductPutawayRules,
    }),
    manyToOneField({
      universalIdentifier: FIELD_IDS.category,
      name: 'category',
      label: 'Product Category',
      icon: 'IconCategory',
      onDelete: OnDeleteAction.CASCADE,
      targetObjectUniversalIdentifier: PRODUCT_CATEGORY_OBJECT_UNIVERSAL_IDENTIFIER,
      targetFieldUniversalIdentifier: FOREIGN_IDS.productCategoryPutawayRules,
    }),
    manyToOneField({
      universalIdentifier: FIELD_IDS.locationIn,
      name: 'locationIn',
      label: 'When product arrives in',
      icon: 'IconMapPin',
      onDelete: OnDeleteAction.CASCADE,
      targetObjectUniversalIdentifier: STOCK_LOCATION_OBJECT_UNIVERSAL_IDENTIFIER,
      targetFieldUniversalIdentifier: FOREIGN_IDS.stockLocationPutawayRules,
    }),
    manyToOneField({
      universalIdentifier: FIELD_IDS.locationOut,
      name: 'locationOut',
      label: 'Store to sublocation',
      icon: 'IconMapPin',
      onDelete: OnDeleteAction.CASCADE,
      targetObjectUniversalIdentifier: STOCK_LOCATION_OBJECT_UNIVERSAL_IDENTIFIER,
      targetFieldUniversalIdentifier: FOREIGN_IDS.stockLocationPutawayRulesOut,
    }),
    numberField(FIELD_IDS.sequence, 'sequence', 'Priority', 'IconArrowsSort', { decimals: 0, int: true }),
    oneToManyField({
      universalIdentifier: FIELD_IDS.packageTypes,
      name: 'packageTypes',
      label: 'Package Type',
      icon: 'IconBox',
      targetObjectUniversalIdentifier: STOCK_PACKAGE_TYPE_STOCK_PUTAWAY_RULE_REL_OBJECT_UNIVERSAL_IDENTIFIER,
      targetFieldUniversalIdentifier: STOCK_PACKAGE_TYPE_STOCK_PUTAWAY_RULE_REL_FIELD_UNIVERSAL_IDENTIFIERS.stockPutawayRule,
      junctionTargetFieldUniversalIdentifier: STOCK_PACKAGE_TYPE_STOCK_PUTAWAY_RULE_REL_FIELD_UNIVERSAL_IDENTIFIERS.stockPackageType,
    }),
    manyToOneField({
      universalIdentifier: FIELD_IDS.storageCategory,
      name: 'storageCategory',
      label: 'Storage Category',
      icon: 'IconBuildingWarehouse',
      onDelete: OnDeleteAction.CASCADE,
      targetObjectUniversalIdentifier: STOCK_STORAGE_CATEGORY_OBJECT_UNIVERSAL_IDENTIFIER,
      targetFieldUniversalIdentifier: STOCK_STORAGE_CATEGORY_FIELD_UNIVERSAL_IDENTIFIERS.putawayRules,
    }),
    activeField(FIELD_IDS.active),
    selectField(FIELD_IDS.sublocation, 'sublocation', 'Sublocation', 'IconMapPins', 'NO', [
      { value: 'NO', label: 'No', color: 'gray' },
      { value: 'LAST_USED', label: 'Last Used', color: 'blue' },
      { value: 'CLOSEST_LOCATION', label: 'Closest Location', color: 'green' },
    ]),
  ],
});
