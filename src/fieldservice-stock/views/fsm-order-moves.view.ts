import { defineView } from 'twenty-sdk/define';

import {
  FIELDSERVICE_STOCK_FIELD_UNIVERSAL_IDENTIFIERS,
  FIELDSERVICE_STOCK_PAGE_UNIVERSAL_IDENTIFIERS as PAGE_IDS,
} from 'src/fieldservice-stock/fieldservice-stock-universal-identifiers.constant';
import { MOVE_FIELDS, PICKING_FIELDS } from 'src/stock/page-layouts/field-ids';
import { PICKING_TYPE_CODE } from 'src/stock/stock-options.constant';
import { STOCK_MOVE_OBJECT_UNIVERSAL_IDENTIFIER } from 'src/stock/stock-universal-identifiers.constant';
import { STOCK_MOVE_ALL_FIELDS } from 'src/stock/views/object-fields';
import { tableWidgetView } from 'src/stock/views/table-widget-view';
import { relatedIs } from 'src/stock/views/view-helpers';

const ORDER_FIELD = FIELDSERVICE_STOCK_FIELD_UNIVERSAL_IDENTIFIERS.stockMoveFsmOrder;

// The moves of the order's deliveries and returns: the moves that name the order, whose transfer has an incoming
// or outgoing operation type (the type is read from the transfer, not from the move's own copy).
export default defineView(
  tableWidgetView({
    universalIdentifier: PAGE_IDS.viewMoves,
    name: 'Service order operations',
    objectUniversalIdentifier: STOCK_MOVE_OBJECT_UNIVERSAL_IDENTIFIER,
    visible: [
      MOVE_FIELDS.name,
      MOVE_FIELDS.picking,
      MOVE_FIELDS.product,
      MOVE_FIELDS.productUomQty,
      MOVE_FIELDS.quantity,
      MOVE_FIELDS.productUom,
      MOVE_FIELDS.location,
      MOVE_FIELDS.locationDest,
      MOVE_FIELDS.state,
    ],
    all: [...STOCK_MOVE_ALL_FIELDS, ORDER_FIELD],
    parentField: ORDER_FIELD,
    extraFilters: [
      relatedIs(PAGE_IDS.viewMoves, MOVE_FIELDS.picking, PICKING_FIELDS.pickingTypeCode, [PICKING_TYPE_CODE.INCOMING, PICKING_TYPE_CODE.OUTGOING]),
    ],
  }),
);
