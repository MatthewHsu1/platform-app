import { definePageLayoutTab } from 'twenty-sdk/define';

import { PRODUCT_TEMPLATE_OBJECT_UNIVERSAL_IDENTIFIER } from 'src/product/product-universal-identifiers.constant';
import { PRODUCT_TEMPLATE_STOCK_FIELDS as F } from 'src/stock/page-layouts/field-ids';
import { recordPageTab, tableWidget } from 'src/stock/page-layouts/widgets';
import {
  STOCK_RECORD_PAGE_TAB_UNIVERSAL_IDENTIFIERS,
  STOCK_TABLE_WIDGET_VIEW_UNIVERSAL_IDENTIFIERS as VIEWS,
} from 'src/stock/stock-pages-universal-identifiers.constant';

const IDS = STOCK_RECORD_PAGE_TAB_UNIVERSAL_IDENTIFIERS.productTemplate;

export default definePageLayoutTab(
  recordPageTab({
    universalIdentifier: IDS.tabInventory,
    objectUniversalIdentifier: PRODUCT_TEMPLATE_OBJECT_UNIVERSAL_IDENTIFIER,
    title: 'Inventory',
    position: 14,
    icon: 'IconBuildingWarehouse',
    widgets: [
      tableWidget(IDS.widgetRoutes, 'Routes', F.routes, VIEWS.templateRoutes),
    ],
  }),
);
