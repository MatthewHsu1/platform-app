import { definePageLayoutTab } from 'twenty-sdk/define';

import { frontComponentWidget, recordPageTab } from 'src/shared/page-layout/widgets';
import { FORECAST_UNIVERSAL_IDENTIFIERS as IDS } from 'src/stock/stock-reports-universal-identifiers.constant';
import { STOCK_WAREHOUSE_ORDERPOINT_OBJECT_UNIVERSAL_IDENTIFIER } from 'src/stock/stock-universal-identifiers.constant';

export default definePageLayoutTab(
  recordPageTab({
    universalIdentifier: IDS.orderpointTab,
    objectUniversalIdentifier: STOCK_WAREHOUSE_ORDERPOINT_OBJECT_UNIVERSAL_IDENTIFIER,
    title: 'Forecast',
    position: 11,
    icon: 'IconChartLine',
    widgets: [frontComponentWidget(IDS.orderpointTabWidget, 'Forecast', IDS.widget)],
  }),
);
