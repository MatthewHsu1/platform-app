import { defineObject } from 'twenty-sdk/define';

import { linkObjectConfig } from 'src/stock/route/link-definitions';
import {
  ROUTING_INVERSE_FIELD_UNIVERSAL_IDENTIFIERS,
  STOCK_WH_RESUPPLY_TABLE_FIELD_UNIVERSAL_IDENTIFIERS,
  STOCK_WH_RESUPPLY_TABLE_OBJECT_UNIVERSAL_IDENTIFIER,
} from 'src/stock/routing-universal-identifiers.constant';
import { STOCK_WAREHOUSE_OBJECT_UNIVERSAL_IDENTIFIER } from 'src/stock/stock-universal-identifiers.constant';

export default defineObject(
  linkObjectConfig({
    universalIdentifier: STOCK_WH_RESUPPLY_TABLE_OBJECT_UNIVERSAL_IDENTIFIER,
    nameSingular: 'stockWhResupplyTable',
    namePlural: 'stockWhResupplyTables',
    labelSingular: 'Resupply link',
    labelPlural: 'Resupply links',
    description: 'A warehouse that resupplies another',
    sides: [
      {
        universalIdentifier: STOCK_WH_RESUPPLY_TABLE_FIELD_UNIVERSAL_IDENTIFIERS.suppliedWh,
        name: 'suppliedWh',
        label: 'Supplied Warehouse',
        icon: 'IconBuildingWarehouse',
        targetObjectUniversalIdentifier: STOCK_WAREHOUSE_OBJECT_UNIVERSAL_IDENTIFIER,
        targetFieldUniversalIdentifier: ROUTING_INVERSE_FIELD_UNIVERSAL_IDENTIFIERS.stockWarehouseResupplyWhs,
      },
      {
        universalIdentifier: STOCK_WH_RESUPPLY_TABLE_FIELD_UNIVERSAL_IDENTIFIERS.supplierWh,
        name: 'supplierWh',
        label: 'Supplying Warehouse',
        icon: 'IconTruckDelivery',
        targetObjectUniversalIdentifier: STOCK_WAREHOUSE_OBJECT_UNIVERSAL_IDENTIFIER,
        targetFieldUniversalIdentifier: ROUTING_INVERSE_FIELD_UNIVERSAL_IDENTIFIERS.stockWarehouseResuppliedWhs,
      },
    ],
  }),
);
