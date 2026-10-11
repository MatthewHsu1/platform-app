import { definePageLayoutTab } from 'twenty-sdk/define';

import { PACKAGE_FIELDS as F } from 'src/stock/page-layouts/field-ids';
import { recordPageTab, tableWidget } from 'src/stock/page-layouts/widgets';
import {
  STOCK_RECORD_PAGE_TAB_UNIVERSAL_IDENTIFIERS,
  STOCK_TABLE_WIDGET_VIEW_UNIVERSAL_IDENTIFIERS as VIEWS,
} from 'src/stock/stock-pages-universal-identifiers.constant';
import { STOCK_PACKAGE_OBJECT_UNIVERSAL_IDENTIFIER } from 'src/stock/stock-universal-identifiers.constant';

const IDS = STOCK_RECORD_PAGE_TAB_UNIVERSAL_IDENTIFIERS.stockPackage;

export default definePageLayoutTab(
  recordPageTab({
    universalIdentifier: IDS.tabChildPackages,
    objectUniversalIdentifier: STOCK_PACKAGE_OBJECT_UNIVERSAL_IDENTIFIER,
    title: 'Child Packages',
    position: 13,
    icon: 'IconBoxMultiple',
    widgets: [
      tableWidget(IDS.widgetChildPackages, 'Child packages', F.childPackages, VIEWS.packageChildPackages),
    ],
  }),
);
