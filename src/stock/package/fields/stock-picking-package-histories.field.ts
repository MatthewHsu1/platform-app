import { defineField } from 'twenty-sdk/define';

import { appWritten, oneToManyField } from 'src/shared/fields';
import {
  STOCK_PACKAGE_HISTORY_STOCK_PICKING_REL_FIELD_UNIVERSAL_IDENTIFIERS as LINK_FIELD_IDS,
  STOCK_PACKAGE_HISTORY_STOCK_PICKING_REL_OBJECT_UNIVERSAL_IDENTIFIER,
  STOCK_PACKAGE_INVERSE_FIELD_UNIVERSAL_IDENTIFIERS as RELATION_IDS,
  STOCK_PICKING_OBJECT_UNIVERSAL_IDENTIFIER,
} from 'src/stock/stock-universal-identifiers.constant';

export default defineField({
  ...appWritten(
    oneToManyField({
      universalIdentifier: RELATION_IDS.stockPickingPackageHistories,
      name: 'packageHistories',
      label: 'Transferred Packages',
      icon: 'IconHistory',
      targetObjectUniversalIdentifier: STOCK_PACKAGE_HISTORY_STOCK_PICKING_REL_OBJECT_UNIVERSAL_IDENTIFIER,
      targetFieldUniversalIdentifier: LINK_FIELD_IDS.stockPicking,
      junctionTargetFieldUniversalIdentifier: LINK_FIELD_IDS.stockPackageHistory,
    }),
  ),
  objectUniversalIdentifier: STOCK_PICKING_OBJECT_UNIVERSAL_IDENTIFIER,
});
