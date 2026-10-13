import { definePageLayoutTab } from 'twenty-sdk/define';

import { MOVE_FIELDS as F } from 'src/stock/page-layouts/field-ids';
import { recordPageTab, tableWidget } from 'src/shared/page-layout/widgets';
import {
  STOCK_RECORD_PAGE_TAB_UNIVERSAL_IDENTIFIERS,
  STOCK_TABLE_WIDGET_VIEW_UNIVERSAL_IDENTIFIERS as VIEWS,
} from 'src/stock/stock-pages-universal-identifiers.constant';
import { STOCK_MOVE_OBJECT_UNIVERSAL_IDENTIFIER } from 'src/stock/stock-universal-identifiers.constant';

const IDS = STOCK_RECORD_PAGE_TAB_UNIVERSAL_IDENTIFIERS.stockMove;

export default definePageLayoutTab(
  recordPageTab({
    universalIdentifier: IDS.tabChain,
    objectUniversalIdentifier: STOCK_MOVE_OBJECT_UNIVERSAL_IDENTIFIER,
    title: 'Chain',
    position: 12,
    icon: 'IconLink',
    widgets: [
      tableWidget(IDS.widgetMoveOrigs, 'Origin moves', F.moveOrigs, VIEWS.moveOrigs),
      tableWidget(IDS.widgetMoveDests, 'Destination moves', F.moveDests, VIEWS.moveDests),
    ],
  }),
);
