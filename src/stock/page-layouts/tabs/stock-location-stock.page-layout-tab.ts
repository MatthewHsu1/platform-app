import { definePageLayoutTab } from 'twenty-sdk/define';

import { LOCATION_FIELDS as F } from 'src/stock/page-layouts/field-ids';
import { recordPageTab, tableWidget } from 'src/shared/page-layout/widgets';
import {
  STOCK_RECORD_PAGE_TAB_UNIVERSAL_IDENTIFIERS,
  STOCK_TABLE_WIDGET_VIEW_UNIVERSAL_IDENTIFIERS as VIEWS,
} from 'src/stock/stock-pages-universal-identifiers.constant';
import { STOCK_LOCATION_OBJECT_UNIVERSAL_IDENTIFIER } from 'src/stock/stock-universal-identifiers.constant';

const IDS = STOCK_RECORD_PAGE_TAB_UNIVERSAL_IDENTIFIERS.stockLocation;

export default definePageLayoutTab(
  recordPageTab({
    universalIdentifier: IDS.tabStock,
    objectUniversalIdentifier: STOCK_LOCATION_OBJECT_UNIVERSAL_IDENTIFIER,
    title: 'Stock',
    position: 11,
    icon: 'IconPackages',
    widgets: [
      tableWidget(IDS.widgetQuants, 'Current stock', F.quants, VIEWS.locationQuants),
    ],
  }),
);
