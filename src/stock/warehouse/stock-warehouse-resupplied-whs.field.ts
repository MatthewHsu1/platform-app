import { defineField } from 'twenty-sdk/define';

import { oneToManyField } from 'src/shared/fields';
import {
  ROUTING_INVERSE_FIELD_UNIVERSAL_IDENTIFIERS,
  STOCK_WH_RESUPPLY_TABLE_FIELD_UNIVERSAL_IDENTIFIERS,
  STOCK_WH_RESUPPLY_TABLE_OBJECT_UNIVERSAL_IDENTIFIER,
} from 'src/stock/routing-universal-identifiers.constant';
import { STOCK_WAREHOUSE_OBJECT_UNIVERSAL_IDENTIFIER } from 'src/stock/stock-universal-identifiers.constant';

export default defineField({
  ...oneToManyField({
    universalIdentifier: ROUTING_INVERSE_FIELD_UNIVERSAL_IDENTIFIERS.stockWarehouseResuppliedWhs,
    name: 'resuppliedWhs',
    label: 'Resupplies',
    icon: 'IconTruckDelivery',
    targetObjectUniversalIdentifier: STOCK_WH_RESUPPLY_TABLE_OBJECT_UNIVERSAL_IDENTIFIER,
    targetFieldUniversalIdentifier: STOCK_WH_RESUPPLY_TABLE_FIELD_UNIVERSAL_IDENTIFIERS.supplierWh,
  }),
  objectUniversalIdentifier: STOCK_WAREHOUSE_OBJECT_UNIVERSAL_IDENTIFIER,
});
