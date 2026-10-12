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
    universalIdentifier: IDS.tabChildLocations,
    objectUniversalIdentifier: STOCK_LOCATION_OBJECT_UNIVERSAL_IDENTIFIER,
    title: 'Child Locations',
    position: 12,
    icon: 'IconSitemap',
    widgets: [
      tableWidget(IDS.widgetChildren, 'Child locations', F.children, VIEWS.locationChildren),
    ],
  }),
);
