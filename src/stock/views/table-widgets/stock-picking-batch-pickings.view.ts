import { defineView } from 'twenty-sdk/define';

import { PICKING_FIELDS } from 'src/stock/page-layouts/field-ids';
import {
  STOCK_TABLE_WIDGET_VIEW_UNIVERSAL_IDENTIFIERS as VIEWS,
} from 'src/stock/stock-pages-universal-identifiers.constant';
import { STOCK_PICKING_OBJECT_UNIVERSAL_IDENTIFIER } from 'src/stock/stock-universal-identifiers.constant';
import { STOCK_PICKING_ALL_FIELDS } from 'src/stock/views/object-fields';
import { tableWidgetView } from 'src/stock/views/table-widget-view';

export default defineView(
  tableWidgetView({
    universalIdentifier: VIEWS.batchPickings,
    name: 'Batch transfers',
    objectUniversalIdentifier: STOCK_PICKING_OBJECT_UNIVERSAL_IDENTIFIER,
    visible: [
      PICKING_FIELDS.name,
      PICKING_FIELDS.location,
      PICKING_FIELDS.locationDest,
      PICKING_FIELDS.company,
      PICKING_FIELDS.person,
      PICKING_FIELDS.origin,
      PICKING_FIELDS.state,
    ],
    all: STOCK_PICKING_ALL_FIELDS,
    parentField: PICKING_FIELDS.batch,
  }),
);
