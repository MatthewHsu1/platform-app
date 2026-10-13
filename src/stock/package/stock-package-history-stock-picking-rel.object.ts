import { defineObject } from 'twenty-sdk/define';

import { linkObjectConfig } from 'src/stock/route/link-definitions';
import {
  STOCK_PACKAGE_HISTORY_FIELD_UNIVERSAL_IDENTIFIERS as HISTORY_FIELD_IDS,
  STOCK_PACKAGE_HISTORY_OBJECT_UNIVERSAL_IDENTIFIER,
  STOCK_PACKAGE_HISTORY_STOCK_PICKING_REL_FIELD_UNIVERSAL_IDENTIFIERS as FIELD_IDS,
  STOCK_PACKAGE_HISTORY_STOCK_PICKING_REL_OBJECT_UNIVERSAL_IDENTIFIER,
  STOCK_PACKAGE_INVERSE_FIELD_UNIVERSAL_IDENTIFIERS as RELATION_IDS,
  STOCK_PICKING_OBJECT_UNIVERSAL_IDENTIFIER,
} from 'src/stock/stock-universal-identifiers.constant';

export default defineObject(
  linkObjectConfig({
    universalIdentifier: STOCK_PACKAGE_HISTORY_STOCK_PICKING_REL_OBJECT_UNIVERSAL_IDENTIFIER,
    nameSingular: 'stockPackageHistoryStockPickingRel',
    namePlural: 'stockPackageHistoryStockPickingRels',
    labelSingular: 'Package history transfer',
    labelPlural: 'Package history transfers',
    description: 'Links a package history to a transfer that moved the package',
    sides: [
      {
        universalIdentifier: FIELD_IDS.stockPackageHistory,
        name: 'stockPackageHistory',
        label: 'Package History',
        icon: 'IconHistory',
        targetObjectUniversalIdentifier: STOCK_PACKAGE_HISTORY_OBJECT_UNIVERSAL_IDENTIFIER,
        targetFieldUniversalIdentifier: HISTORY_FIELD_IDS.pickings,
      },
      {
        universalIdentifier: FIELD_IDS.stockPicking,
        name: 'stockPicking',
        label: 'Transfer',
        icon: 'IconTruckDelivery',
        targetObjectUniversalIdentifier: STOCK_PICKING_OBJECT_UNIVERSAL_IDENTIFIER,
        targetFieldUniversalIdentifier: RELATION_IDS.stockPickingPackageHistories,
      },
    ],
  }),
);
