import { defineView } from 'twenty-sdk/define';

import { PICKING_FIELDS } from 'src/stock/page-layouts/field-ids';
import {
  STOCK_TABLE_WIDGET_VIEW_UNIVERSAL_IDENTIFIERS as VIEWS,
} from 'src/stock/stock-pages-universal-identifiers.constant';
import { STOCK_PICKING_OBJECT_UNIVERSAL_IDENTIFIER } from 'src/stock/stock-universal-identifiers.constant';
import { PICKING_LIST_COLUMNS } from 'src/stock/views/list-columns';
import { STOCK_PICKING_ALL_FIELDS } from 'src/stock/views/object-fields';
import { tableWidgetView } from 'src/stock/views/table-widget-view';

export default defineView(
  tableWidgetView({
    universalIdentifier: VIEWS.pickingTypePickings,
    name: 'Operation type transfers',
    objectUniversalIdentifier: STOCK_PICKING_OBJECT_UNIVERSAL_IDENTIFIER,
    visible: PICKING_LIST_COLUMNS,
    all: STOCK_PICKING_ALL_FIELDS,
    parentField: PICKING_FIELDS.pickingType,
  }),
);
