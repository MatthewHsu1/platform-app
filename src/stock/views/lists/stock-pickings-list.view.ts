import { defineView, ViewType } from 'twenty-sdk/define';

import {
  INVENTORY_LIST_VIEW_UNIVERSAL_IDENTIFIERS as VIEWS,
} from 'src/stock/stock-pages-universal-identifiers.constant';
import { STOCK_PICKING_OBJECT_UNIVERSAL_IDENTIFIER } from 'src/stock/stock-universal-identifiers.constant';
import { listColumns, PICKING_LIST_COLUMNS } from 'src/stock/views/list-columns';
import { STOCK_PICKING_ALL_FIELDS } from 'src/stock/views/object-fields';

export default defineView({
  universalIdentifier: VIEWS.transfers,
  name: 'Transfers',
  objectUniversalIdentifier: STOCK_PICKING_OBJECT_UNIVERSAL_IDENTIFIER,
  type: ViewType.TABLE,
  icon: 'IconTruck',
  position: 0,
  fields: listColumns(VIEWS.transfers, PICKING_LIST_COLUMNS, STOCK_PICKING_ALL_FIELDS),
});
