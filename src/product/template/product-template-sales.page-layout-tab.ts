import { definePageLayoutTab } from 'twenty-sdk/define';

import {
  PRODUCT_COMBO_INVERSE_FIELD_UNIVERSAL_IDENTIFIERS as COMBO_FIELD_IDS,
  PRODUCT_COMBO_PAGE_LAYOUT_WIDGET_UNIVERSAL_IDENTIFIERS as COMBO_WIDGET_IDS,
  PRODUCT_PRICELIST_INVERSE_FIELD_UNIVERSAL_IDENTIFIERS as PRICING_FIELD_IDS,
  PRODUCT_PRICING_PAGE_LAYOUT_WIDGET_UNIVERSAL_IDENTIFIERS as PRICING_WIDGET_IDS,
  PRODUCT_TEMPLATE_OBJECT_UNIVERSAL_IDENTIFIER,
  PRODUCT_TEMPLATE_PAGE_LAYOUT_UNIVERSAL_IDENTIFIERS as LAYOUT_IDS,
} from 'src/product/product-universal-identifiers.constant';
import { recordPageTab, tableWidget } from 'src/shared/page-layout/widgets';
import { STOCK_TABLE_WIDGET_VIEW_UNIVERSAL_IDENTIFIERS as VIEWS } from 'src/stock/stock-pages-universal-identifiers.constant';

export default definePageLayoutTab(
  recordPageTab({
    universalIdentifier: LAYOUT_IDS.tabSales,
    objectUniversalIdentifier: PRODUCT_TEMPLATE_OBJECT_UNIVERSAL_IDENTIFIER,
    title: 'Sales',
    position: 12,
    icon: 'IconShoppingCart',
    widgets: [
      tableWidget(PRICING_WIDGET_IDS.widgetPricelistRules, 'Pricelist rules', PRICING_FIELD_IDS.templatePricelistRules, VIEWS.templatePricelistRules),
      tableWidget(COMBO_WIDGET_IDS.widgetCombos, 'Combo choices', COMBO_FIELD_IDS.templateCombos, VIEWS.templateCombos),
    ],
  }),
);
