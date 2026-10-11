import { defineView } from 'twenty-sdk/define';

import { MOVE_LINE_FIELDS } from 'src/stock/page-layouts/field-ids';
import {
  STOCK_TABLE_WIDGET_VIEW_UNIVERSAL_IDENTIFIERS as VIEWS,
} from 'src/stock/stock-pages-universal-identifiers.constant';
import {
  STOCK_LOT_INVERSE_FIELD_UNIVERSAL_IDENTIFIERS,
  STOCK_MOVE_LINE_OBJECT_UNIVERSAL_IDENTIFIER,
} from 'src/stock/stock-universal-identifiers.constant';
import { STOCK_MOVE_LINE_ALL_FIELDS } from 'src/stock/views/object-fields';
import { tableWidgetView } from 'src/stock/views/table-widget-view';

export default defineView(
  tableWidgetView({
    universalIdentifier: VIEWS.pickingMoveLines,
    name: 'Transfer operations',
    objectUniversalIdentifier: STOCK_MOVE_LINE_OBJECT_UNIVERSAL_IDENTIFIER,
    visible: [
      MOVE_LINE_FIELDS.name,
      MOVE_LINE_FIELDS.product,
      MOVE_LINE_FIELDS.lot,
      STOCK_LOT_INVERSE_FIELD_UNIVERSAL_IDENTIFIERS.stockMoveLineLotName,
      MOVE_LINE_FIELDS.locationDest,
      MOVE_LINE_FIELDS.resultPackage,
      MOVE_LINE_FIELDS.owner,
      MOVE_LINE_FIELDS.quantity,
      MOVE_LINE_FIELDS.productUom,
    ],
    all: STOCK_MOVE_LINE_ALL_FIELDS,
    parentField: MOVE_LINE_FIELDS.picking,
  }),
);
