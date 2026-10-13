import { defineField, OnDeleteAction } from 'twenty-sdk/define';

import { manyToOneField } from 'src/shared/fields';
import {
  STOCK_MOVE_LINE_OBJECT_UNIVERSAL_IDENTIFIER,
  STOCK_PACKAGE_FIELD_UNIVERSAL_IDENTIFIERS,
  STOCK_PACKAGE_INVERSE_FIELD_UNIVERSAL_IDENTIFIERS as RELATION_IDS,
  STOCK_PACKAGE_OBJECT_UNIVERSAL_IDENTIFIER,
} from 'src/stock/stock-universal-identifiers.constant';

export default defineField({
  ...manyToOneField({
    universalIdentifier: RELATION_IDS.stockMoveLinePackage,
    name: 'package',
    label: 'Source Package',
    icon: 'IconPackage',
    onDelete: OnDeleteAction.RESTRICT,
    targetObjectUniversalIdentifier: STOCK_PACKAGE_OBJECT_UNIVERSAL_IDENTIFIER,
    targetFieldUniversalIdentifier: STOCK_PACKAGE_FIELD_UNIVERSAL_IDENTIFIERS.moveLines,
  }),
  objectUniversalIdentifier: STOCK_MOVE_LINE_OBJECT_UNIVERSAL_IDENTIFIER,
});
