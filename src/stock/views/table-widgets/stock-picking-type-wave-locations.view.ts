import { defineView } from 'twenty-sdk/define';

import {
  STOCK_LOCATION_STOCK_PICKING_TYPE_REL_FIELD_UNIVERSAL_IDENTIFIERS,
  STOCK_PICKING_BATCH_INVERSE_FIELD_UNIVERSAL_IDENTIFIERS,
} from 'src/stock-picking-batch/stock-picking-batch-universal-identifiers.constant';
import { LOCATION_FIELDS } from 'src/stock/page-layouts/field-ids';
import {
  STOCK_TABLE_WIDGET_VIEW_UNIVERSAL_IDENTIFIERS as VIEWS,
} from 'src/stock/stock-pages-universal-identifiers.constant';
import { STOCK_LOCATION_OBJECT_UNIVERSAL_IDENTIFIER } from 'src/stock/stock-universal-identifiers.constant';
import { STOCK_LOCATION_ALL_FIELDS } from 'src/stock/views/object-fields';
import { tableWidgetView } from 'src/stock/views/table-widget-view';

export default defineView(
  tableWidgetView({
    universalIdentifier: VIEWS.pickingTypeWaveLocations,
    name: 'Wave locations',
    objectUniversalIdentifier: STOCK_LOCATION_OBJECT_UNIVERSAL_IDENTIFIER,
    visible: [LOCATION_FIELDS.name, LOCATION_FIELDS.completeName],
    all: STOCK_LOCATION_ALL_FIELDS,
    parentField: STOCK_PICKING_BATCH_INVERSE_FIELD_UNIVERSAL_IDENTIFIERS.stockLocationWaveLinks,
    throughField: STOCK_LOCATION_STOCK_PICKING_TYPE_REL_FIELD_UNIVERSAL_IDENTIFIERS.stockPickingType,
  }),
);
