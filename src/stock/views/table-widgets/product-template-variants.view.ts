import { defineView } from 'twenty-sdk/define';

import {
  PRODUCT_PRODUCT_ATTRIBUTE_FIELD_UNIVERSAL_IDENTIFIERS,
  PRODUCT_PRODUCT_FIELD_UNIVERSAL_IDENTIFIERS,
  PRODUCT_PRODUCT_OBJECT_UNIVERSAL_IDENTIFIER,
} from 'src/product/product-universal-identifiers.constant';
import { PRODUCT_PRODUCT_STOCK_FIELDS } from 'src/stock/page-layouts/field-ids';
import {
  STOCK_TABLE_WIDGET_VIEW_UNIVERSAL_IDENTIFIERS as VIEWS,
} from 'src/stock/stock-pages-universal-identifiers.constant';
import { PRODUCT_PRODUCT_ALL_FIELDS } from 'src/stock/views/object-fields';
import { tableWidgetView } from 'src/stock/views/table-widget-view';

export default defineView(
  tableWidgetView({
    universalIdentifier: VIEWS.templateVariants,
    name: 'Product variants',
    objectUniversalIdentifier: PRODUCT_PRODUCT_OBJECT_UNIVERSAL_IDENTIFIER,
    visible: [
      PRODUCT_PRODUCT_FIELD_UNIVERSAL_IDENTIFIERS.name,
      PRODUCT_PRODUCT_ATTRIBUTE_FIELD_UNIVERSAL_IDENTIFIERS.productTemplateAttributeValues,
      PRODUCT_PRODUCT_FIELD_UNIVERSAL_IDENTIFIERS.defaultCode,
      PRODUCT_PRODUCT_FIELD_UNIVERSAL_IDENTIFIERS.lstPrice,
      PRODUCT_PRODUCT_FIELD_UNIVERSAL_IDENTIFIERS.standardPrice,
      PRODUCT_PRODUCT_STOCK_FIELDS.qtyAvailable,
      PRODUCT_PRODUCT_STOCK_FIELDS.virtualAvailable,
    ],
    all: PRODUCT_PRODUCT_ALL_FIELDS,
    parentField: PRODUCT_PRODUCT_FIELD_UNIVERSAL_IDENTIFIERS.productTmpl,
  }),
);
