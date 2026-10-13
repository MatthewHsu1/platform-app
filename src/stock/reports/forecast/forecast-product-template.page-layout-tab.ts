import { definePageLayoutTab } from 'twenty-sdk/define';

import { PRODUCT_TEMPLATE_OBJECT_UNIVERSAL_IDENTIFIER } from 'src/product/product-universal-identifiers.constant';
import { frontComponentWidget, recordPageTab } from 'src/shared/page-layout/widgets';
import { FORECAST_UNIVERSAL_IDENTIFIERS as IDS } from 'src/stock/stock-reports-universal-identifiers.constant';

export default definePageLayoutTab(
  recordPageTab({
    universalIdentifier: IDS.productTemplateTab,
    objectUniversalIdentifier: PRODUCT_TEMPLATE_OBJECT_UNIVERSAL_IDENTIFIER,
    title: 'Forecast',
    position: 15,
    icon: 'IconChartLine',
    widgets: [frontComponentWidget(IDS.productTemplateTabWidget, 'Forecast', IDS.widget)],
  }),
);
