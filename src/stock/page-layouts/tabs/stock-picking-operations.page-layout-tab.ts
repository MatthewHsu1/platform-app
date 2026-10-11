import { definePageLayoutTab } from 'twenty-sdk/define';

import { PICKING_FIELDS as F } from 'src/stock/page-layouts/field-ids';
import { frontComponentWidget, recordPageTab, tableWidget } from 'src/stock/page-layouts/widgets';
import {
  STOCK_RECORD_PAGE_TAB_UNIVERSAL_IDENTIFIERS,
  STOCK_TABLE_WIDGET_VIEW_UNIVERSAL_IDENTIFIERS as VIEWS,
} from 'src/stock/stock-pages-universal-identifiers.constant';
import { RECORD_FACTS_UNIVERSAL_IDENTIFIERS as FACTS } from 'src/stock/stock-reports-universal-identifiers.constant';
import { STOCK_PICKING_OBJECT_UNIVERSAL_IDENTIFIER } from 'src/stock/stock-universal-identifiers.constant';

const IDS = STOCK_RECORD_PAGE_TAB_UNIVERSAL_IDENTIFIERS.stockPicking;

export default definePageLayoutTab(
  recordPageTab({
    universalIdentifier: IDS.tabOperations,
    objectUniversalIdentifier: STOCK_PICKING_OBJECT_UNIVERSAL_IDENTIFIER,
    title: 'Operations',
    position: 11,
    icon: 'IconList',
    widgets: [
      frontComponentWidget(FACTS.pickingFactsWidget, 'Transfer facts', FACTS.pickingFacts),
      tableWidget(IDS.widgetMoves, 'Stock moves', F.moves, VIEWS.pickingMoves),
    ],
  }),
);
