import { defineView } from 'twenty-sdk/define';

import {
  PRODUCT_CATEGORY_FIELD_UNIVERSAL_IDENTIFIERS,
  PRODUCT_CATEGORY_OBJECT_UNIVERSAL_IDENTIFIER,
} from 'src/product/product-universal-identifiers.constant';
import {
  PRODUCT_CATEGORY_STOCK_PICKING_TYPE_REL_FIELD_UNIVERSAL_IDENTIFIERS,
  STOCK_PICKING_BATCH_INVERSE_FIELD_UNIVERSAL_IDENTIFIERS,
} from 'src/stock-picking-batch/stock-picking-batch-universal-identifiers.constant';
import {
  STOCK_TABLE_WIDGET_VIEW_UNIVERSAL_IDENTIFIERS as VIEWS,
} from 'src/stock/stock-pages-universal-identifiers.constant';
import { systemField } from 'src/stock/views/list-columns';
import { PRODUCT_CATEGORY_ALL_FIELDS } from 'src/stock/views/object-fields';
import { tableWidgetView } from 'src/stock/views/table-widget-view';

export default defineView(
  tableWidgetView({
    universalIdentifier: VIEWS.pickingTypeWaveCategories,
    name: 'Wave product categories',
    objectUniversalIdentifier: PRODUCT_CATEGORY_OBJECT_UNIVERSAL_IDENTIFIER,
    visible: [
      systemField(PRODUCT_CATEGORY_OBJECT_UNIVERSAL_IDENTIFIER, 'name'),
      PRODUCT_CATEGORY_FIELD_UNIVERSAL_IDENTIFIERS.completeName,
    ],
    all: PRODUCT_CATEGORY_ALL_FIELDS,
    parentField: STOCK_PICKING_BATCH_INVERSE_FIELD_UNIVERSAL_IDENTIFIERS.productCategoryWaveLinks,
    throughField: PRODUCT_CATEGORY_STOCK_PICKING_TYPE_REL_FIELD_UNIVERSAL_IDENTIFIERS.stockPickingType,
  }),
);
