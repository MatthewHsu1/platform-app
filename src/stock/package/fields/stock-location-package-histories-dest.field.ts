import { defineField } from 'twenty-sdk/define';

import { oneToManyField } from 'src/shared/fields';
import {
  STOCK_LOCATION_OBJECT_UNIVERSAL_IDENTIFIER,
  STOCK_PACKAGE_HISTORY_FIELD_UNIVERSAL_IDENTIFIERS,
  STOCK_PACKAGE_HISTORY_OBJECT_UNIVERSAL_IDENTIFIER,
  STOCK_PACKAGE_INVERSE_FIELD_UNIVERSAL_IDENTIFIERS as RELATION_IDS,
} from 'src/stock/stock-universal-identifiers.constant';

export default defineField({
  ...oneToManyField({
    universalIdentifier: RELATION_IDS.stockLocationPackageHistoriesDest,
    name: 'packageHistoriesDest',
    label: 'Package histories (destination)',
    icon: 'IconHistory',
    targetObjectUniversalIdentifier: STOCK_PACKAGE_HISTORY_OBJECT_UNIVERSAL_IDENTIFIER,
    targetFieldUniversalIdentifier: STOCK_PACKAGE_HISTORY_FIELD_UNIVERSAL_IDENTIFIERS.locationDest,
  }),
  objectUniversalIdentifier: STOCK_LOCATION_OBJECT_UNIVERSAL_IDENTIFIER,
});
