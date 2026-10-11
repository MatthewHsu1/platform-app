import { definePageLayoutTab } from 'twenty-sdk/define';

import { PRODUCT_PRODUCT_OBJECT_UNIVERSAL_IDENTIFIER } from 'src/product/product-universal-identifiers.constant';
import { PRODUCT_PRODUCT_STOCK_FIELDS as F } from 'src/stock/page-layouts/field-ids';
import { frontComponentWidget, recordPageTab, tableWidget } from 'src/stock/page-layouts/widgets';
import {
  STOCK_RECORD_PAGE_TAB_UNIVERSAL_IDENTIFIERS,
  STOCK_TABLE_WIDGET_VIEW_UNIVERSAL_IDENTIFIERS as VIEWS,
} from 'src/stock/stock-pages-universal-identifiers.constant';
import { RECORD_FACTS_UNIVERSAL_IDENTIFIERS as FACTS } from 'src/stock/stock-reports-universal-identifiers.constant';

const IDS = STOCK_RECORD_PAGE_TAB_UNIVERSAL_IDENTIFIERS.productProduct;

export default definePageLayoutTab(
  recordPageTab({
    universalIdentifier: IDS.tabInventory,
    objectUniversalIdentifier: PRODUCT_PRODUCT_OBJECT_UNIVERSAL_IDENTIFIER,
    title: 'Inventory',
    position: 11,
    icon: 'IconBuildingWarehouse',
    widgets: [
      tableWidget(IDS.widgetStockQuants, 'Stock', F.stockQuants, VIEWS.productQuants),
      tableWidget(IDS.widgetStockLots, 'Lots/Serial numbers', F.stockLots, VIEWS.productLots),
      tableWidget(IDS.widgetOrderpoints, 'Reordering rules', F.orderpoints, VIEWS.productOrderpoints),
      tableWidget(IDS.widgetPutawayRules, 'Putaway rules', F.putawayRules, VIEWS.productPutawayRules),
      tableWidget(IDS.widgetStorageCapacities, 'Storage capacities', F.storageCapacities, VIEWS.productStorageCapacities),
      frontComponentWidget(FACTS.variantQuantsWidget, 'Quants', FACTS.variantQuants),
    ],
  }),
);
