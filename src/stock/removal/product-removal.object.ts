import { defineObject, FieldType } from 'twenty-sdk/define';

import { PRODUCT_CATEGORY_OBJECT_UNIVERSAL_IDENTIFIER } from 'src/product/product-universal-identifiers.constant';
import { appWritten, oneToManyField, selectField, seedKeyField } from 'src/shared/fields';
import {
  PRODUCT_REMOVAL_FIELD_UNIVERSAL_IDENTIFIERS as FIELD_IDS,
  PRODUCT_REMOVAL_OBJECT_UNIVERSAL_IDENTIFIER,
  ROUTING_INVERSE_FIELD_UNIVERSAL_IDENTIFIERS as FOREIGN_IDS,
} from 'src/stock/routing-universal-identifiers.constant';
import { STOCK_LOCATION_OBJECT_UNIVERSAL_IDENTIFIER } from 'src/stock/stock-universal-identifiers.constant';

// Rows come from the install step only; code switches on `method`.
export default defineObject({
  universalIdentifier: PRODUCT_REMOVAL_OBJECT_UNIVERSAL_IDENTIFIER,
  nameSingular: 'productRemoval',
  namePlural: 'productRemovals',
  labelSingular: 'Removal strategy',
  labelPlural: 'Removal strategies',
  description: 'The order stock is taken from a location',
  icon: 'IconArrowsSort',
  isUICreatable: false,
  labelIdentifierFieldMetadataUniversalIdentifier: FIELD_IDS.name,
  fields: [
    appWritten({ universalIdentifier: FIELD_IDS.name, name: 'name', label: 'Name', icon: 'IconAbc', type: FieldType.TEXT }),
    appWritten(
      selectField(FIELD_IDS.method, 'method', 'Method', 'IconListNumbers', 'FIFO', [
        { value: 'FIFO', label: 'First In First Out (FIFO)', color: 'blue' },
        { value: 'LIFO', label: 'Last In First Out (LIFO)', color: 'purple' },
        { value: 'CLOSEST', label: 'Closest Location', color: 'green' },
        { value: 'LEAST_PACKAGES', label: 'Least Packages', color: 'orange' },
        { value: 'FEFO', label: 'First Expiry First Out (FEFO)', color: 'red' },
      ]),
    ),
    seedKeyField(FIELD_IDS.seedKey),
    oneToManyField({
      universalIdentifier: FIELD_IDS.locations,
      name: 'locations',
      label: 'Locations',
      icon: 'IconMapPin',
      targetObjectUniversalIdentifier: STOCK_LOCATION_OBJECT_UNIVERSAL_IDENTIFIER,
      targetFieldUniversalIdentifier: FOREIGN_IDS.stockLocationRemovalStrategy,
    }),
    oneToManyField({
      universalIdentifier: FIELD_IDS.categories,
      name: 'categories',
      label: 'Product categories',
      icon: 'IconCategory',
      targetObjectUniversalIdentifier: PRODUCT_CATEGORY_OBJECT_UNIVERSAL_IDENTIFIER,
      targetFieldUniversalIdentifier: FOREIGN_IDS.productCategoryRemovalStrategy,
    }),
  ],
});
