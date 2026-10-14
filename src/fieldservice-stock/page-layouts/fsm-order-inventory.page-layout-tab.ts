import { definePageLayoutTab } from 'twenty-sdk/define';

import {
  FIELDSERVICE_STOCK_FIELD_UNIVERSAL_IDENTIFIERS,
  FIELDSERVICE_STOCK_PAGE_UNIVERSAL_IDENTIFIERS as PAGE_IDS,
} from 'src/fieldservice-stock/fieldservice-stock-universal-identifiers.constant';
import {
  FSM_ORDER_FIELD_UNIVERSAL_IDENTIFIERS,
  FSM_ORDER_OBJECT_UNIVERSAL_IDENTIFIER,
} from 'src/fieldservice/fieldservice-universal-identifiers.constant';
import { cardWidget, recordPageTab, tableWidget } from 'src/shared/page-layout/widgets';

// The order's stock on its own tab: the moves of its deliveries and returns, and its location as a card that
// expands into the location's fields, among them its stock location.
export default definePageLayoutTab(
  recordPageTab({
    universalIdentifier: PAGE_IDS.tabInventory,
    objectUniversalIdentifier: FSM_ORDER_OBJECT_UNIVERSAL_IDENTIFIER,
    title: 'Inventory',
    position: 11,
    icon: 'IconBuildingWarehouse',
    widgets: [
      tableWidget(PAGE_IDS.widgetMoves, 'Operations', FIELDSERVICE_STOCK_FIELD_UNIVERSAL_IDENTIFIERS.fsmOrderMoves, PAGE_IDS.viewMoves),
      cardWidget(PAGE_IDS.widgetLocation, 'Service location', FSM_ORDER_FIELD_UNIVERSAL_IDENTIFIERS.location),
    ],
  }),
);
