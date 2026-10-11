import { defineView } from 'twenty-sdk/define';

import {
  PRODUCT_PRICELIST_ITEM_FIELD_UNIVERSAL_IDENTIFIERS,
  PRODUCT_PRICELIST_ITEM_OBJECT_UNIVERSAL_IDENTIFIER,
} from 'src/product/product-universal-identifiers.constant';
import {
  STOCK_TABLE_WIDGET_VIEW_UNIVERSAL_IDENTIFIERS as VIEWS,
} from 'src/stock/stock-pages-universal-identifiers.constant';
import { PRODUCT_PRICELIST_ITEM_ALL_FIELDS } from 'src/stock/views/object-fields';
import { tableWidgetView } from 'src/stock/views/table-widget-view';

export default defineView(
  tableWidgetView({
    universalIdentifier: VIEWS.templatePricelistRules,
    name: 'Product pricelist rules',
    objectUniversalIdentifier: PRODUCT_PRICELIST_ITEM_OBJECT_UNIVERSAL_IDENTIFIER,
    visible: [
      PRODUCT_PRICELIST_ITEM_FIELD_UNIVERSAL_IDENTIFIERS.name,
      PRODUCT_PRICELIST_ITEM_FIELD_UNIVERSAL_IDENTIFIERS.pricelist,
      PRODUCT_PRICELIST_ITEM_FIELD_UNIVERSAL_IDENTIFIERS.product,
      PRODUCT_PRICELIST_ITEM_FIELD_UNIVERSAL_IDENTIFIERS.fixedPrice,
      PRODUCT_PRICELIST_ITEM_FIELD_UNIVERSAL_IDENTIFIERS.minQuantity,
      PRODUCT_PRICELIST_ITEM_FIELD_UNIVERSAL_IDENTIFIERS.dateStart,
      PRODUCT_PRICELIST_ITEM_FIELD_UNIVERSAL_IDENTIFIERS.dateEnd,
    ],
    all: PRODUCT_PRICELIST_ITEM_ALL_FIELDS,
    parentField: PRODUCT_PRICELIST_ITEM_FIELD_UNIVERSAL_IDENTIFIERS.productTmpl,
  }),
);
