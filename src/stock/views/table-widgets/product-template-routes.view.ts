import { defineView } from 'twenty-sdk/define';

import {
  STOCK_ROUTE_FIELD_UNIVERSAL_IDENTIFIERS,
  STOCK_ROUTE_OBJECT_UNIVERSAL_IDENTIFIER,
  STOCK_ROUTE_PRODUCT_FIELD_UNIVERSAL_IDENTIFIERS,
} from 'src/stock/routing-universal-identifiers.constant';
import {
  STOCK_TABLE_WIDGET_VIEW_UNIVERSAL_IDENTIFIERS as VIEWS,
} from 'src/stock/stock-pages-universal-identifiers.constant';
import { STOCK_ROUTE_ALL_FIELDS } from 'src/stock/views/object-fields';
import { tableWidgetView } from 'src/stock/views/table-widget-view';

export default defineView(
  tableWidgetView({
    universalIdentifier: VIEWS.templateRoutes,
    name: 'Product routes',
    objectUniversalIdentifier: STOCK_ROUTE_OBJECT_UNIVERSAL_IDENTIFIER,
    visible: [STOCK_ROUTE_FIELD_UNIVERSAL_IDENTIFIERS.name],
    all: STOCK_ROUTE_ALL_FIELDS,
    parentField: STOCK_ROUTE_FIELD_UNIVERSAL_IDENTIFIERS.products,
    throughField: STOCK_ROUTE_PRODUCT_FIELD_UNIVERSAL_IDENTIFIERS.productTemplate,
  }),
);
