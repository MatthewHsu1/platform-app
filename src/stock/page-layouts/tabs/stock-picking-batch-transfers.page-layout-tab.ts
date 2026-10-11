import { definePageLayoutTab } from 'twenty-sdk/define';

import {
  STOCK_PICKING_BATCH_OBJECT_UNIVERSAL_IDENTIFIER,
} from 'src/stock-picking-batch/stock-picking-batch-universal-identifiers.constant';
import { BATCH_FIELDS as F } from 'src/stock/page-layouts/field-ids';
import { recordPageTab, tableWidget } from 'src/stock/page-layouts/widgets';
import {
  STOCK_RECORD_PAGE_TAB_UNIVERSAL_IDENTIFIERS,
  STOCK_TABLE_WIDGET_VIEW_UNIVERSAL_IDENTIFIERS as VIEWS,
} from 'src/stock/stock-pages-universal-identifiers.constant';

const IDS = STOCK_RECORD_PAGE_TAB_UNIVERSAL_IDENTIFIERS.stockPickingBatch;

export default definePageLayoutTab(
  recordPageTab({
    universalIdentifier: IDS.tabTransfers,
    objectUniversalIdentifier: STOCK_PICKING_BATCH_OBJECT_UNIVERSAL_IDENTIFIER,
    title: 'Transfers',
    position: 11,
    icon: 'IconTruck',
    widgets: [
      tableWidget(IDS.widgetPickings, 'Transfers', F.pickings, VIEWS.batchPickings),
    ],
  }),
);
