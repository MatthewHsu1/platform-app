import { defineView } from 'twenty-sdk/define';

import {
  PRODUCT_TEMPLATE_ATTRIBUTE_EXCLUSION_FIELD_UNIVERSAL_IDENTIFIERS,
  PRODUCT_TEMPLATE_ATTRIBUTE_EXCLUSION_OBJECT_UNIVERSAL_IDENTIFIER,
} from 'src/product/product-universal-identifiers.constant';
import {
  STOCK_TABLE_WIDGET_VIEW_UNIVERSAL_IDENTIFIERS as VIEWS,
} from 'src/stock/stock-pages-universal-identifiers.constant';
import { PRODUCT_TEMPLATE_ATTRIBUTE_EXCLUSION_ALL_FIELDS } from 'src/stock/views/object-fields';
import { tableWidgetView } from 'src/stock/views/table-widget-view';

export default defineView(
  tableWidgetView({
    universalIdentifier: VIEWS.templateExclusions,
    name: 'Product attribute exclusions',
    objectUniversalIdentifier: PRODUCT_TEMPLATE_ATTRIBUTE_EXCLUSION_OBJECT_UNIVERSAL_IDENTIFIER,
    visible: [
      PRODUCT_TEMPLATE_ATTRIBUTE_EXCLUSION_FIELD_UNIVERSAL_IDENTIFIERS.name,
      PRODUCT_TEMPLATE_ATTRIBUTE_EXCLUSION_FIELD_UNIVERSAL_IDENTIFIERS.productTemplateAttributeValue,
      PRODUCT_TEMPLATE_ATTRIBUTE_EXCLUSION_FIELD_UNIVERSAL_IDENTIFIERS.values,
    ],
    all: PRODUCT_TEMPLATE_ATTRIBUTE_EXCLUSION_ALL_FIELDS,
    parentField: PRODUCT_TEMPLATE_ATTRIBUTE_EXCLUSION_FIELD_UNIVERSAL_IDENTIFIERS.productTmpl,
  }),
);
