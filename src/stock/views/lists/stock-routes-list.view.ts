import { defineView, ViewType } from 'twenty-sdk/define';

import {
  STOCK_ROUTE_FIELD_UNIVERSAL_IDENTIFIERS,
  STOCK_ROUTE_OBJECT_UNIVERSAL_IDENTIFIER,
} from 'src/stock/routing-universal-identifiers.constant';
import {
  INVENTORY_LIST_VIEW_UNIVERSAL_IDENTIFIERS as VIEWS,
} from 'src/stock/stock-pages-universal-identifiers.constant';
import { listColumns } from 'src/stock/views/list-columns';
import { STOCK_ROUTE_ALL_FIELDS } from 'src/stock/views/object-fields';

export default defineView({
  universalIdentifier: VIEWS.routes,
  name: 'Routes',
  objectUniversalIdentifier: STOCK_ROUTE_OBJECT_UNIVERSAL_IDENTIFIER,
  type: ViewType.TABLE,
  icon: 'IconRoute',
  position: 0,
  fields: listColumns(VIEWS.routes, [STOCK_ROUTE_FIELD_UNIVERSAL_IDENTIFIERS.name], STOCK_ROUTE_ALL_FIELDS),
});
