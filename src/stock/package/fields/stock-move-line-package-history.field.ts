import { defineField, OnDeleteAction } from 'twenty-sdk/define';

import { appWritten, manyToOneField } from 'src/shared/fields';
import {
  STOCK_MOVE_LINE_OBJECT_UNIVERSAL_IDENTIFIER,
  STOCK_PACKAGE_HISTORY_FIELD_UNIVERSAL_IDENTIFIERS,
  STOCK_PACKAGE_HISTORY_OBJECT_UNIVERSAL_IDENTIFIER,
  STOCK_PACKAGE_INVERSE_FIELD_UNIVERSAL_IDENTIFIERS as RELATION_IDS,
} from 'src/stock/stock-universal-identifiers.constant';

export default defineField({
  ...appWritten(
    manyToOneField({
      universalIdentifier: RELATION_IDS.stockMoveLinePackageHistory,
      name: 'packageHistory',
      label: 'Package History',
      icon: 'IconHistory',
      onDelete: OnDeleteAction.SET_NULL,
      targetObjectUniversalIdentifier: STOCK_PACKAGE_HISTORY_OBJECT_UNIVERSAL_IDENTIFIER,
      targetFieldUniversalIdentifier: STOCK_PACKAGE_HISTORY_FIELD_UNIVERSAL_IDENTIFIERS.moveLines,
    }),
  ),
  objectUniversalIdentifier: STOCK_MOVE_LINE_OBJECT_UNIVERSAL_IDENTIFIER,
});
