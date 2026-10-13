import { defineView, ViewType } from 'twenty-sdk/define';

import { WAREHOUSE_FIELDS } from 'src/stock/page-layouts/field-ids';
import {
  INVENTORY_LIST_VIEW_UNIVERSAL_IDENTIFIERS as VIEWS,
} from 'src/stock/stock-pages-universal-identifiers.constant';
import { STOCK_WAREHOUSE_OBJECT_UNIVERSAL_IDENTIFIER } from 'src/stock/stock-universal-identifiers.constant';
import { listColumns } from 'src/stock/views/list-columns';
import { STOCK_WAREHOUSE_ALL_FIELDS } from 'src/stock/views/object-fields';

export default defineView({
  universalIdentifier: VIEWS.warehouses,
  name: 'Warehouses',
  objectUniversalIdentifier: STOCK_WAREHOUSE_OBJECT_UNIVERSAL_IDENTIFIER,
  type: ViewType.TABLE,
  icon: 'IconBuildingWarehouse',
  position: 0,
  fields: listColumns(VIEWS.warehouses, [WAREHOUSE_FIELDS.name, WAREHOUSE_FIELDS.lotStock, WAREHOUSE_FIELDS.partner], STOCK_WAREHOUSE_ALL_FIELDS),
});
