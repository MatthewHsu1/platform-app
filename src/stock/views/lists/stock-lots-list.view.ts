import { defineView, ViewType } from 'twenty-sdk/define';

import {
  INVENTORY_LIST_VIEW_UNIVERSAL_IDENTIFIERS as VIEWS,
} from 'src/stock/stock-pages-universal-identifiers.constant';
import { STOCK_LOT_OBJECT_UNIVERSAL_IDENTIFIER } from 'src/stock/stock-universal-identifiers.constant';
import { lotListColumns } from 'src/stock/views/lot-list-columns';

export default defineView({
  universalIdentifier: VIEWS.lots,
  name: 'Lots/Serial Numbers',
  objectUniversalIdentifier: STOCK_LOT_OBJECT_UNIVERSAL_IDENTIFIER,
  type: ViewType.TABLE,
  icon: 'IconBarcode',
  position: 0,
  fields: lotListColumns(VIEWS.lots),
});
