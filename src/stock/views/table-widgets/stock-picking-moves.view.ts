import { defineView } from 'twenty-sdk/define';

import { MOVE_FIELDS } from 'src/stock/page-layouts/field-ids';
import {
  STOCK_TABLE_WIDGET_VIEW_UNIVERSAL_IDENTIFIERS as VIEWS,
} from 'src/stock/stock-pages-universal-identifiers.constant';
import { STOCK_MOVE_OBJECT_UNIVERSAL_IDENTIFIER } from 'src/stock/stock-universal-identifiers.constant';
import { STOCK_MOVE_ALL_FIELDS } from 'src/stock/views/object-fields';
import { tableWidgetView } from 'src/stock/views/table-widget-view';

export default defineView(
  tableWidgetView({
    universalIdentifier: VIEWS.pickingMoves,
    name: 'Transfer stock moves',
    objectUniversalIdentifier: STOCK_MOVE_OBJECT_UNIVERSAL_IDENTIFIER,
    visible: [
      MOVE_FIELDS.name,
      MOVE_FIELDS.product,
      MOVE_FIELDS.descriptionPicking,
      MOVE_FIELDS.productUomQty,
      MOVE_FIELDS.quantity,
      MOVE_FIELDS.productUom,
    ],
    all: STOCK_MOVE_ALL_FIELDS,
    parentField: MOVE_FIELDS.picking,
  }),
);
