import { definePageLayoutTab } from 'twenty-sdk/define';

import { PICKING_FIELDS as F } from 'src/stock/page-layouts/field-ids';
import { recordPageTab, tableWidget } from 'src/shared/page-layout/widgets';
import {
  STOCK_RECORD_PAGE_TAB_UNIVERSAL_IDENTIFIERS,
  STOCK_TABLE_WIDGET_VIEW_UNIVERSAL_IDENTIFIERS as VIEWS,
} from 'src/stock/stock-pages-universal-identifiers.constant';
import { STOCK_PICKING_OBJECT_UNIVERSAL_IDENTIFIER } from 'src/stock/stock-universal-identifiers.constant';

const IDS = STOCK_RECORD_PAGE_TAB_UNIVERSAL_IDENTIFIERS.stockPicking;

export default definePageLayoutTab(
  recordPageTab({
    universalIdentifier: IDS.tabDetailedOperations,
    objectUniversalIdentifier: STOCK_PICKING_OBJECT_UNIVERSAL_IDENTIFIER,
    title: 'Detailed Operations',
    position: 12,
    icon: 'IconListDetails',
    widgets: [
      tableWidget(IDS.widgetMoveLines, 'Operations', F.moveLines, VIEWS.pickingMoveLines),
    ],
  }),
);
