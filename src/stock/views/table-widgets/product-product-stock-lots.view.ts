import { defineView } from 'twenty-sdk/define';

import { LOT_FIELDS } from 'src/stock/page-layouts/field-ids';
import {
  STOCK_TABLE_WIDGET_VIEW_UNIVERSAL_IDENTIFIERS as VIEWS,
} from 'src/stock/stock-pages-universal-identifiers.constant';
import { STOCK_LOT_OBJECT_UNIVERSAL_IDENTIFIER } from 'src/stock/stock-universal-identifiers.constant';
import { systemField } from 'src/stock/views/list-columns';
import { STOCK_LOT_ALL_FIELDS } from 'src/stock/views/object-fields';
import { tableWidgetView } from 'src/stock/views/table-widget-view';

export default defineView(
  tableWidgetView({
    universalIdentifier: VIEWS.productLots,
    name: 'Variant lots',
    objectUniversalIdentifier: STOCK_LOT_OBJECT_UNIVERSAL_IDENTIFIER,
    visible: [LOT_FIELDS.name, systemField(STOCK_LOT_OBJECT_UNIVERSAL_IDENTIFIER, 'createdAt')],
    all: STOCK_LOT_ALL_FIELDS,
    parentField: LOT_FIELDS.product,
  }),
);
