import { defineView } from 'twenty-sdk/define';

import {
  PRODUCT_SUPPLIERINFO_FIELD_UNIVERSAL_IDENTIFIERS,
  PRODUCT_SUPPLIERINFO_OBJECT_UNIVERSAL_IDENTIFIER,
} from 'src/product/product-universal-identifiers.constant';
import {
  STOCK_TABLE_WIDGET_VIEW_UNIVERSAL_IDENTIFIERS as VIEWS,
} from 'src/stock/stock-pages-universal-identifiers.constant';
import { PRODUCT_SUPPLIERINFO_ALL_FIELDS } from 'src/stock/views/object-fields';
import { tableWidgetView } from 'src/stock/views/table-widget-view';

export default defineView(
  tableWidgetView({
    universalIdentifier: VIEWS.templateSellers,
    name: 'Product vendor prices',
    objectUniversalIdentifier: PRODUCT_SUPPLIERINFO_OBJECT_UNIVERSAL_IDENTIFIER,
    visible: [
      PRODUCT_SUPPLIERINFO_FIELD_UNIVERSAL_IDENTIFIERS.name,
      PRODUCT_SUPPLIERINFO_FIELD_UNIVERSAL_IDENTIFIERS.partner,
      PRODUCT_SUPPLIERINFO_FIELD_UNIVERSAL_IDENTIFIERS.price,
      PRODUCT_SUPPLIERINFO_FIELD_UNIVERSAL_IDENTIFIERS.productUom,
      PRODUCT_SUPPLIERINFO_FIELD_UNIVERSAL_IDENTIFIERS.delay,
    ],
    all: PRODUCT_SUPPLIERINFO_ALL_FIELDS,
    parentField: PRODUCT_SUPPLIERINFO_FIELD_UNIVERSAL_IDENTIFIERS.productTmpl,
  }),
);
