import { defineField, OnDeleteAction } from 'twenty-sdk/define';

import { PRODUCT_TEMPLATE_OBJECT_UNIVERSAL_IDENTIFIER } from 'src/product/product-universal-identifiers.constant';
import { manyToOneField } from 'src/shared/fields';
import {
  STOCK_INVERSE_FIELD_UNIVERSAL_IDENTIFIERS as FIELD_IDS,
  STOCK_LOCATION_FIELD_UNIVERSAL_IDENTIFIERS,
  STOCK_LOCATION_OBJECT_UNIVERSAL_IDENTIFIER,
} from 'src/stock/stock-universal-identifiers.constant';

// Empty means the seeded Inventory adjustment location.
export default defineField({
  ...manyToOneField({
    universalIdentifier: FIELD_IDS.productTemplatePropertyStockInventory,
    name: 'propertyStockInventory',
    label: 'Inventory location',
    icon: 'IconMapPin',
    targetObjectUniversalIdentifier: STOCK_LOCATION_OBJECT_UNIVERSAL_IDENTIFIER,
    targetFieldUniversalIdentifier: STOCK_LOCATION_FIELD_UNIVERSAL_IDENTIFIERS.inventoryProductTemplates,
    onDelete: OnDeleteAction.SET_NULL,
  }),
  objectUniversalIdentifier: PRODUCT_TEMPLATE_OBJECT_UNIVERSAL_IDENTIFIER,
});
