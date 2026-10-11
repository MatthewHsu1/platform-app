import { defineView } from 'twenty-sdk/define';

import {
  STOCK_STORAGE_CATEGORY_CAPACITY_FIELD_UNIVERSAL_IDENTIFIERS,
  STOCK_STORAGE_CATEGORY_CAPACITY_OBJECT_UNIVERSAL_IDENTIFIER,
} from 'src/stock/routing-universal-identifiers.constant';
import {
  STOCK_TABLE_WIDGET_VIEW_UNIVERSAL_IDENTIFIERS as VIEWS,
} from 'src/stock/stock-pages-universal-identifiers.constant';
import { STOCK_STORAGE_CATEGORY_CAPACITY_ALL_FIELDS } from 'src/stock/views/object-fields';
import { tableWidgetView } from 'src/stock/views/table-widget-view';

export default defineView(
  tableWidgetView({
    universalIdentifier: VIEWS.productStorageCapacities,
    name: 'Variant storage capacities',
    objectUniversalIdentifier: STOCK_STORAGE_CATEGORY_CAPACITY_OBJECT_UNIVERSAL_IDENTIFIER,
    visible: [
      STOCK_STORAGE_CATEGORY_CAPACITY_FIELD_UNIVERSAL_IDENTIFIERS.name,
      STOCK_STORAGE_CATEGORY_CAPACITY_FIELD_UNIVERSAL_IDENTIFIERS.storageCategory,
      STOCK_STORAGE_CATEGORY_CAPACITY_FIELD_UNIVERSAL_IDENTIFIERS.packageType,
      STOCK_STORAGE_CATEGORY_CAPACITY_FIELD_UNIVERSAL_IDENTIFIERS.quantity,
    ],
    all: STOCK_STORAGE_CATEGORY_CAPACITY_ALL_FIELDS,
    parentField: STOCK_STORAGE_CATEGORY_CAPACITY_FIELD_UNIVERSAL_IDENTIFIERS.product,
  }),
);
