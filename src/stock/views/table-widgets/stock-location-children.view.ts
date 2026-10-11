import { defineView } from 'twenty-sdk/define';

import { LOCATION_FIELDS } from 'src/stock/page-layouts/field-ids';
import {
  STOCK_TABLE_WIDGET_VIEW_UNIVERSAL_IDENTIFIERS as VIEWS,
} from 'src/stock/stock-pages-universal-identifiers.constant';
import { STOCK_LOCATION_OBJECT_UNIVERSAL_IDENTIFIER } from 'src/stock/stock-universal-identifiers.constant';
import { STOCK_LOCATION_ALL_FIELDS } from 'src/stock/views/object-fields';
import { tableWidgetView } from 'src/stock/views/table-widget-view';

export default defineView(
  tableWidgetView({
    universalIdentifier: VIEWS.locationChildren,
    name: 'Child locations',
    objectUniversalIdentifier: STOCK_LOCATION_OBJECT_UNIVERSAL_IDENTIFIER,
    visible: [
      LOCATION_FIELDS.name,
      LOCATION_FIELDS.completeName,
      LOCATION_FIELDS.usage,
      LOCATION_FIELDS.storageCategory,
    ],
    all: STOCK_LOCATION_ALL_FIELDS,
    parentField: LOCATION_FIELDS.location,
  }),
);
