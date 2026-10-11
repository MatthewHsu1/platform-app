import { defineView } from 'twenty-sdk/define';

import { PACKAGE_FIELDS } from 'src/stock/page-layouts/field-ids';
import {
  STOCK_TABLE_WIDGET_VIEW_UNIVERSAL_IDENTIFIERS as VIEWS,
} from 'src/stock/stock-pages-universal-identifiers.constant';
import { STOCK_PACKAGE_OBJECT_UNIVERSAL_IDENTIFIER } from 'src/stock/stock-universal-identifiers.constant';
import { STOCK_PACKAGE_ALL_FIELDS } from 'src/stock/views/object-fields';
import { tableWidgetView } from 'src/stock/views/table-widget-view';

export default defineView(
  tableWidgetView({
    universalIdentifier: VIEWS.packageChildPackages,
    name: 'Child packages',
    objectUniversalIdentifier: STOCK_PACKAGE_OBJECT_UNIVERSAL_IDENTIFIER,
    visible: [PACKAGE_FIELDS.name, PACKAGE_FIELDS.packageType, PACKAGE_FIELDS.location],
    all: STOCK_PACKAGE_ALL_FIELDS,
    parentField: PACKAGE_FIELDS.parentPackage,
  }),
);
