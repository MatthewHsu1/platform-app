import { definePageLayoutTab } from 'twenty-sdk/define';

import {
  PRODUCT_PRICELIST_INVERSE_FIELD_UNIVERSAL_IDENTIFIERS as PRICING_FIELD_IDS,
  PRODUCT_PRICING_PAGE_LAYOUT_WIDGET_UNIVERSAL_IDENTIFIERS as PRICING_WIDGET_IDS,
  PRODUCT_TEMPLATE_OBJECT_UNIVERSAL_IDENTIFIER,
  PRODUCT_TEMPLATE_PAGE_LAYOUT_UNIVERSAL_IDENTIFIERS as LAYOUT_IDS,
} from 'src/product/product-universal-identifiers.constant';
import { recordPageTab, tableWidget } from 'src/shared/page-layout/widgets';
import { STOCK_TABLE_WIDGET_VIEW_UNIVERSAL_IDENTIFIERS as VIEWS } from 'src/stock/stock-pages-universal-identifiers.constant';

export default definePageLayoutTab(
  recordPageTab({
    universalIdentifier: LAYOUT_IDS.tabPurchase,
    objectUniversalIdentifier: PRODUCT_TEMPLATE_OBJECT_UNIVERSAL_IDENTIFIER,
    title: 'Purchase',
    position: 13,
    icon: 'IconShoppingBag',
    widgets: [tableWidget(PRICING_WIDGET_IDS.widgetSellers, 'Vendor prices', PRICING_FIELD_IDS.templateSellers, VIEWS.templateSellers)],
  }),
);
