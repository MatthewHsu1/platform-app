import { definePageLayoutTab } from 'twenty-sdk/define';

import { PICKING_TYPE_FIELDS as F } from 'src/stock/page-layouts/field-ids';
import { recordPageTab, tableWidget } from 'src/stock/page-layouts/widgets';
import {
  STOCK_RECORD_PAGE_TAB_UNIVERSAL_IDENTIFIERS,
  STOCK_TABLE_WIDGET_VIEW_UNIVERSAL_IDENTIFIERS as VIEWS,
} from 'src/stock/stock-pages-universal-identifiers.constant';
import { STOCK_PICKING_TYPE_OBJECT_UNIVERSAL_IDENTIFIER } from 'src/stock/stock-universal-identifiers.constant';

const IDS = STOCK_RECORD_PAGE_TAB_UNIVERSAL_IDENTIFIERS.stockPickingType;

export default definePageLayoutTab(
  recordPageTab({
    universalIdentifier: IDS.tabTransfers,
    objectUniversalIdentifier: STOCK_PICKING_TYPE_OBJECT_UNIVERSAL_IDENTIFIER,
    title: 'Transfers',
    position: 12,
    icon: 'IconTruck',
    widgets: [
      tableWidget(IDS.widgetPickings, 'Transfers', F.pickings, VIEWS.pickingTypePickings),
    ],
  }),
);
