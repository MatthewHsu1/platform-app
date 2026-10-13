import { definePageLayoutTab } from 'twenty-sdk/define';

import { WAREHOUSE_FIELDS as F } from 'src/stock/page-layouts/field-ids';
import { recordPageTab, tableWidget } from 'src/shared/page-layout/widgets';
import {
  STOCK_RECORD_PAGE_TAB_UNIVERSAL_IDENTIFIERS,
  STOCK_TABLE_WIDGET_VIEW_UNIVERSAL_IDENTIFIERS as VIEWS,
} from 'src/stock/stock-pages-universal-identifiers.constant';
import { STOCK_WAREHOUSE_OBJECT_UNIVERSAL_IDENTIFIER } from 'src/stock/stock-universal-identifiers.constant';

const IDS = STOCK_RECORD_PAGE_TAB_UNIVERSAL_IDENTIFIERS.stockWarehouse;

export default definePageLayoutTab(
  recordPageTab({
    universalIdentifier: IDS.tabRoutes,
    objectUniversalIdentifier: STOCK_WAREHOUSE_OBJECT_UNIVERSAL_IDENTIFIER,
    title: 'Routes',
    position: 11,
    icon: 'IconRoute',
    widgets: [
      tableWidget(IDS.widgetRoutes, 'Routes', F.routes, VIEWS.warehouseRoutes),
      tableWidget(IDS.widgetResupplyRoutes, 'Resupply routes', F.resupplyRoutes, VIEWS.warehouseResupplyRoutes),
    ],
  }),
);
