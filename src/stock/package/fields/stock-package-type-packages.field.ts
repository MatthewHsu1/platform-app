import { defineField } from 'twenty-sdk/define';

import { oneToManyField } from 'src/shared/fields';
import { STOCK_PACKAGE_TYPE_OBJECT_UNIVERSAL_IDENTIFIER } from 'src/stock/routing-universal-identifiers.constant';
import {
  STOCK_PACKAGE_FIELD_UNIVERSAL_IDENTIFIERS,
  STOCK_PACKAGE_INVERSE_FIELD_UNIVERSAL_IDENTIFIERS as RELATION_IDS,
  STOCK_PACKAGE_OBJECT_UNIVERSAL_IDENTIFIER,
} from 'src/stock/stock-universal-identifiers.constant';

export default defineField({
  ...oneToManyField({
    universalIdentifier: RELATION_IDS.stockPackageTypePackages,
    name: 'packages',
    label: 'Packages',
    icon: 'IconPackage',
    targetObjectUniversalIdentifier: STOCK_PACKAGE_OBJECT_UNIVERSAL_IDENTIFIER,
    targetFieldUniversalIdentifier: STOCK_PACKAGE_FIELD_UNIVERSAL_IDENTIFIERS.packageType,
  }),
  objectUniversalIdentifier: STOCK_PACKAGE_TYPE_OBJECT_UNIVERSAL_IDENTIFIER,
});
