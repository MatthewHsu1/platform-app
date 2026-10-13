import { defineObject, FieldType } from 'twenty-sdk/define';

import { numberField, oneToManyField, selectField } from 'src/shared/fields';
import {
  ROUTING_INVERSE_FIELD_UNIVERSAL_IDENTIFIERS as FOREIGN_IDS,
  STOCK_PUTAWAY_RULE_FIELD_UNIVERSAL_IDENTIFIERS,
  STOCK_PUTAWAY_RULE_OBJECT_UNIVERSAL_IDENTIFIER,
  STOCK_STORAGE_CATEGORY_CAPACITY_FIELD_UNIVERSAL_IDENTIFIERS,
  STOCK_STORAGE_CATEGORY_CAPACITY_OBJECT_UNIVERSAL_IDENTIFIER,
  STOCK_STORAGE_CATEGORY_FIELD_UNIVERSAL_IDENTIFIERS as FIELD_IDS,
  STOCK_STORAGE_CATEGORY_OBJECT_UNIVERSAL_IDENTIFIER,
} from 'src/stock/routing-universal-identifiers.constant';
import { STOCK_LOCATION_OBJECT_UNIVERSAL_IDENTIFIER } from 'src/stock/stock-universal-identifiers.constant';

export default defineObject({
  universalIdentifier: STOCK_STORAGE_CATEGORY_OBJECT_UNIVERSAL_IDENTIFIER,
  nameSingular: 'stockStorageCategory',
  namePlural: 'stockStorageCategories',
  labelSingular: 'Storage category',
  labelPlural: 'Storage categories',
  description: 'What a location may hold: weight, capacities, product mix',
  icon: 'IconBuildingWarehouse',
  labelIdentifierFieldMetadataUniversalIdentifier: FIELD_IDS.name,
  fields: [
    { universalIdentifier: FIELD_IDS.name, name: 'name', label: 'Storage Category', icon: 'IconAbc', type: FieldType.TEXT },
    numberField(FIELD_IDS.maxWeight, 'maxWeight', 'Max Weight', 'IconWeight', { decimals: 2, defaultValue: 0 }),
    oneToManyField({
      universalIdentifier: FIELD_IDS.capacities,
      name: 'capacities',
      label: 'Capacity',
      icon: 'IconStack2',
      targetObjectUniversalIdentifier: STOCK_STORAGE_CATEGORY_CAPACITY_OBJECT_UNIVERSAL_IDENTIFIER,
      targetFieldUniversalIdentifier: STOCK_STORAGE_CATEGORY_CAPACITY_FIELD_UNIVERSAL_IDENTIFIERS.storageCategory,
    }),
    selectField(FIELD_IDS.allowNewProduct, 'allowNewProduct', 'Allow New Product', 'IconFilter', 'MIXED', [
      { value: 'EMPTY', label: 'If the location is empty', color: 'orange' },
      { value: 'SAME', label: 'If all products are same', color: 'blue' },
      { value: 'MIXED', label: 'Allow mixed products', color: 'green' },
    ]),
    oneToManyField({
      universalIdentifier: FIELD_IDS.locations,
      name: 'locations',
      label: 'Locations',
      icon: 'IconMapPin',
      targetObjectUniversalIdentifier: STOCK_LOCATION_OBJECT_UNIVERSAL_IDENTIFIER,
      targetFieldUniversalIdentifier: FOREIGN_IDS.stockLocationStorageCategory,
    }),
    oneToManyField({
      universalIdentifier: FIELD_IDS.putawayRules,
      name: 'putawayRules',
      label: 'Putaway rules',
      icon: 'IconArrowBarToDown',
      targetObjectUniversalIdentifier: STOCK_PUTAWAY_RULE_OBJECT_UNIVERSAL_IDENTIFIER,
      targetFieldUniversalIdentifier: STOCK_PUTAWAY_RULE_FIELD_UNIVERSAL_IDENTIFIERS.storageCategory,
    }),
  ],
});
