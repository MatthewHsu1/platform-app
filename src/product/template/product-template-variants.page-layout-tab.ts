import { definePageLayoutTab } from 'twenty-sdk/define';

import {
  PRODUCT_ATTRIBUTE_PAGE_LAYOUT_WIDGET_UNIVERSAL_IDENTIFIERS as ATTRIBUTE_WIDGET_IDS,
  PRODUCT_TEMPLATE_ATTRIBUTE_FIELD_UNIVERSAL_IDENTIFIERS as ATTRIBUTE_FIELD_IDS,
  PRODUCT_TEMPLATE_FIELD_UNIVERSAL_IDENTIFIERS as FIELD_IDS,
  PRODUCT_TEMPLATE_OBJECT_UNIVERSAL_IDENTIFIER,
  PRODUCT_TEMPLATE_PAGE_LAYOUT_UNIVERSAL_IDENTIFIERS as LAYOUT_IDS,
} from 'src/product/product-universal-identifiers.constant';
import { recordPageTab, tableWidget } from 'src/stock/page-layouts/widgets';
import { STOCK_TABLE_WIDGET_VIEW_UNIVERSAL_IDENTIFIERS as VIEWS } from 'src/stock/stock-pages-universal-identifiers.constant';

export default definePageLayoutTab(
  recordPageTab({
    universalIdentifier: LAYOUT_IDS.tabVariants,
    objectUniversalIdentifier: PRODUCT_TEMPLATE_OBJECT_UNIVERSAL_IDENTIFIER,
    title: 'Attributes & variants',
    position: 11,
    icon: 'IconBoxMultiple',
    widgets: [
      tableWidget(ATTRIBUTE_WIDGET_IDS.widgetAttributeLines, 'Attributes', ATTRIBUTE_FIELD_IDS.attributeLines, VIEWS.templateAttributeLines),
      tableWidget(ATTRIBUTE_WIDGET_IDS.widgetExclusions, 'Exclusions', ATTRIBUTE_FIELD_IDS.exclusions, VIEWS.templateExclusions),
      tableWidget(LAYOUT_IDS.widgetProductVariants, 'Variants', FIELD_IDS.productVariants, VIEWS.templateVariants),
    ],
  }),
);
