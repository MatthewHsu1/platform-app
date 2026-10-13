import { defineView } from 'twenty-sdk/define';

import { ORDERPOINT_FIELDS } from 'src/stock/page-layouts/field-ids';
import {
  STOCK_TABLE_WIDGET_VIEW_UNIVERSAL_IDENTIFIERS as VIEWS,
} from 'src/stock/stock-pages-universal-identifiers.constant';
import { STOCK_WAREHOUSE_ORDERPOINT_OBJECT_UNIVERSAL_IDENTIFIER } from 'src/stock/stock-universal-identifiers.constant';
import { STOCK_WAREHOUSE_ORDERPOINT_ALL_FIELDS } from 'src/stock/views/object-fields';
import { tableWidgetView } from 'src/stock/views/table-widget-view';

export default defineView(
  tableWidgetView({
    universalIdentifier: VIEWS.productOrderpoints,
    name: 'Variant reordering rules',
    objectUniversalIdentifier: STOCK_WAREHOUSE_ORDERPOINT_OBJECT_UNIVERSAL_IDENTIFIER,
    visible: [
      ORDERPOINT_FIELDS.name,
      ORDERPOINT_FIELDS.location,
      ORDERPOINT_FIELDS.qtyOnHand,
      ORDERPOINT_FIELDS.qtyForecast,
      ORDERPOINT_FIELDS.productMinQty,
      ORDERPOINT_FIELDS.productMaxQty,
      ORDERPOINT_FIELDS.qtyToOrder,
    ],
    all: STOCK_WAREHOUSE_ORDERPOINT_ALL_FIELDS,
    parentField: ORDERPOINT_FIELDS.product,
  }),
);
