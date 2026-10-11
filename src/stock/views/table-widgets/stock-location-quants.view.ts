import { defineView } from 'twenty-sdk/define';

import { QUANT_FIELDS } from 'src/stock/page-layouts/field-ids';
import {
  STOCK_TABLE_WIDGET_VIEW_UNIVERSAL_IDENTIFIERS as VIEWS,
} from 'src/stock/stock-pages-universal-identifiers.constant';
import { STOCK_QUANT_OBJECT_UNIVERSAL_IDENTIFIER } from 'src/stock/stock-universal-identifiers.constant';
import { STOCK_QUANT_ALL_FIELDS } from 'src/stock/views/object-fields';
import { tableWidgetView } from 'src/stock/views/table-widget-view';

export default defineView(
  tableWidgetView({
    universalIdentifier: VIEWS.locationQuants,
    name: 'Location stock',
    objectUniversalIdentifier: STOCK_QUANT_OBJECT_UNIVERSAL_IDENTIFIER,
    visible: [
      QUANT_FIELDS.name,
      QUANT_FIELDS.product,
      QUANT_FIELDS.package,
      QUANT_FIELDS.lot,
      QUANT_FIELDS.owner,
      QUANT_FIELDS.quantity,
      QUANT_FIELDS.reservedQuantity,
    ],
    all: STOCK_QUANT_ALL_FIELDS,
    parentField: QUANT_FIELDS.location,
  }),
);
