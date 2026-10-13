import { defineObject, FieldType, OnDeleteAction } from 'twenty-sdk/define';

import { PRODUCT_PRODUCT_OBJECT_UNIVERSAL_IDENTIFIER } from 'src/product/product-universal-identifiers.constant';
import { appWritten, manyToOneField, numberField } from 'src/shared/fields';
import {
  ROUTING_INVERSE_FIELD_UNIVERSAL_IDENTIFIERS as FOREIGN_IDS,
  STOCK_PACKAGE_TYPE_FIELD_UNIVERSAL_IDENTIFIERS,
  STOCK_PACKAGE_TYPE_OBJECT_UNIVERSAL_IDENTIFIER,
  STOCK_STORAGE_CATEGORY_CAPACITY_FIELD_UNIVERSAL_IDENTIFIERS as FIELD_IDS,
  STOCK_STORAGE_CATEGORY_CAPACITY_OBJECT_UNIVERSAL_IDENTIFIER,
  STOCK_STORAGE_CATEGORY_FIELD_UNIVERSAL_IDENTIFIERS,
  STOCK_STORAGE_CATEGORY_OBJECT_UNIVERSAL_IDENTIFIER,
} from 'src/stock/routing-universal-identifiers.constant';

// A row caps one product or one package type; the database lets both be empty.
export default defineObject({
  universalIdentifier: STOCK_STORAGE_CATEGORY_CAPACITY_OBJECT_UNIVERSAL_IDENTIFIER,
  nameSingular: 'stockStorageCategoryCapacity',
  namePlural: 'stockStorageCategoryCapacities',
  labelSingular: 'Storage capacity',
  labelPlural: 'Storage capacities',
  description: 'How much of a product or how many packages of a type a storage category holds',
  icon: 'IconStack2',
  labelIdentifierFieldMetadataUniversalIdentifier: FIELD_IDS.name,
  fields: [
    appWritten({ universalIdentifier: FIELD_IDS.name, name: 'name', label: 'Name', icon: 'IconAbc', type: FieldType.TEXT }),
    manyToOneField({
      universalIdentifier: FIELD_IDS.storageCategory,
      name: 'storageCategory',
      label: 'Storage Category',
      icon: 'IconBuildingWarehouse',
      onDelete: OnDeleteAction.CASCADE,
      targetObjectUniversalIdentifier: STOCK_STORAGE_CATEGORY_OBJECT_UNIVERSAL_IDENTIFIER,
      targetFieldUniversalIdentifier: STOCK_STORAGE_CATEGORY_FIELD_UNIVERSAL_IDENTIFIERS.capacities,
    }),
    manyToOneField({
      universalIdentifier: FIELD_IDS.product,
      name: 'product',
      label: 'Product',
      icon: 'IconBoxMultiple',
      onDelete: OnDeleteAction.CASCADE,
      targetObjectUniversalIdentifier: PRODUCT_PRODUCT_OBJECT_UNIVERSAL_IDENTIFIER,
      targetFieldUniversalIdentifier: FOREIGN_IDS.productProductStorageCapacities,
    }),
    manyToOneField({
      universalIdentifier: FIELD_IDS.packageType,
      name: 'packageType',
      label: 'Package Type',
      icon: 'IconPackage',
      onDelete: OnDeleteAction.CASCADE,
      targetObjectUniversalIdentifier: STOCK_PACKAGE_TYPE_OBJECT_UNIVERSAL_IDENTIFIER,
      targetFieldUniversalIdentifier: STOCK_PACKAGE_TYPE_FIELD_UNIVERSAL_IDENTIFIERS.storageCategoryCapacities,
    }),
    numberField(FIELD_IDS.quantity, 'quantity', 'Quantity', 'IconHash', { decimals: 2 }),
  ],
});
