import { defineView, ViewType } from 'twenty-sdk/define';

import { LOT_FIELDS } from 'src/stock/page-layouts/field-ids';
import {
  INVENTORY_LIST_VIEW_UNIVERSAL_IDENTIFIERS as VIEWS,
} from 'src/stock/stock-pages-universal-identifiers.constant';
import { STOCK_LOT_OBJECT_UNIVERSAL_IDENTIFIER } from 'src/stock/stock-universal-identifiers.constant';
import { listColumns, systemField } from 'src/stock/views/list-columns';
import { STOCK_LOT_ALL_FIELDS } from 'src/stock/views/object-fields';

export default defineView({
  universalIdentifier: VIEWS.lots,
  name: 'Lots/Serial Numbers',
  objectUniversalIdentifier: STOCK_LOT_OBJECT_UNIVERSAL_IDENTIFIER,
  type: ViewType.TABLE,
  icon: 'IconBarcode',
  position: 0,
  fields: listColumns(VIEWS.lots, [
    LOT_FIELDS.name,
    LOT_FIELDS.product,
    systemField(STOCK_LOT_OBJECT_UNIVERSAL_IDENTIFIER, 'createdAt'),
  ], STOCK_LOT_ALL_FIELDS),
});
