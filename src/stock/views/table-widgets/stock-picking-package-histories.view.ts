import { defineView } from 'twenty-sdk/define';

import {
  STOCK_TABLE_WIDGET_VIEW_UNIVERSAL_IDENTIFIERS as VIEWS,
} from 'src/stock/stock-pages-universal-identifiers.constant';
import {
  STOCK_PACKAGE_HISTORY_FIELD_UNIVERSAL_IDENTIFIERS,
  STOCK_PACKAGE_HISTORY_OBJECT_UNIVERSAL_IDENTIFIER,
  STOCK_PACKAGE_HISTORY_STOCK_PICKING_REL_FIELD_UNIVERSAL_IDENTIFIERS,
} from 'src/stock/stock-universal-identifiers.constant';
import { STOCK_PACKAGE_HISTORY_ALL_FIELDS } from 'src/stock/views/object-fields';
import { tableWidgetView } from 'src/stock/views/table-widget-view';

export default defineView(
  tableWidgetView({
    universalIdentifier: VIEWS.pickingPackageHistories,
    name: 'Transfer packages',
    objectUniversalIdentifier: STOCK_PACKAGE_HISTORY_OBJECT_UNIVERSAL_IDENTIFIER,
    visible: [
      STOCK_PACKAGE_HISTORY_FIELD_UNIVERSAL_IDENTIFIERS.packageName,
      STOCK_PACKAGE_HISTORY_FIELD_UNIVERSAL_IDENTIFIERS.location,
      STOCK_PACKAGE_HISTORY_FIELD_UNIVERSAL_IDENTIFIERS.parentOrig,
      STOCK_PACKAGE_HISTORY_FIELD_UNIVERSAL_IDENTIFIERS.locationDest,
      STOCK_PACKAGE_HISTORY_FIELD_UNIVERSAL_IDENTIFIERS.parentDest,
    ],
    all: STOCK_PACKAGE_HISTORY_ALL_FIELDS,
    parentField: STOCK_PACKAGE_HISTORY_FIELD_UNIVERSAL_IDENTIFIERS.pickings,
    throughField: STOCK_PACKAGE_HISTORY_STOCK_PICKING_REL_FIELD_UNIVERSAL_IDENTIFIERS.stockPicking,
  }),
);
