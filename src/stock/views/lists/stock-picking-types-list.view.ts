import { defineView, ViewType } from 'twenty-sdk/define';

import { PICKING_TYPE_FIELDS } from 'src/stock/page-layouts/field-ids';
import {
  INVENTORY_LIST_VIEW_UNIVERSAL_IDENTIFIERS as VIEWS,
} from 'src/stock/stock-pages-universal-identifiers.constant';
import { STOCK_PICKING_TYPE_OBJECT_UNIVERSAL_IDENTIFIER } from 'src/stock/stock-universal-identifiers.constant';
import { listColumns } from 'src/stock/views/list-columns';
import { STOCK_PICKING_TYPE_ALL_FIELDS } from 'src/stock/views/object-fields';

export default defineView({
  universalIdentifier: VIEWS.operationTypes,
  name: 'Operation Types',
  objectUniversalIdentifier: STOCK_PICKING_TYPE_OBJECT_UNIVERSAL_IDENTIFIER,
  type: ViewType.TABLE,
  icon: 'IconArrowsExchange',
  position: 0,
  fields: listColumns(VIEWS.operationTypes, [
    PICKING_TYPE_FIELDS.name,
    PICKING_TYPE_FIELDS.warehouse,
    PICKING_TYPE_FIELDS.referenceSequence,
  ], STOCK_PICKING_TYPE_ALL_FIELDS),
});
