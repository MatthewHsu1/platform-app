import { defineView } from 'twenty-sdk/define';

import {
  PRODUCT_COMBO_FIELD_UNIVERSAL_IDENTIFIERS,
  PRODUCT_COMBO_OBJECT_UNIVERSAL_IDENTIFIER,
  PRODUCT_COMBO_PRODUCT_TEMPLATE_REL_FIELD_UNIVERSAL_IDENTIFIERS,
} from 'src/product/product-universal-identifiers.constant';
import {
  STOCK_TABLE_WIDGET_VIEW_UNIVERSAL_IDENTIFIERS as VIEWS,
} from 'src/stock/stock-pages-universal-identifiers.constant';
import { systemField } from 'src/stock/views/list-columns';
import { PRODUCT_COMBO_ALL_FIELDS } from 'src/stock/views/object-fields';
import { tableWidgetView } from 'src/stock/views/table-widget-view';

export default defineView(
  tableWidgetView({
    universalIdentifier: VIEWS.templateCombos,
    name: 'Product combo choices',
    objectUniversalIdentifier: PRODUCT_COMBO_OBJECT_UNIVERSAL_IDENTIFIER,
    visible: [systemField(PRODUCT_COMBO_OBJECT_UNIVERSAL_IDENTIFIER, 'name')],
    all: PRODUCT_COMBO_ALL_FIELDS,
    parentField: PRODUCT_COMBO_FIELD_UNIVERSAL_IDENTIFIERS.productTemplateLinks,
    throughField: PRODUCT_COMBO_PRODUCT_TEMPLATE_REL_FIELD_UNIVERSAL_IDENTIFIERS.productTemplate,
  }),
);
