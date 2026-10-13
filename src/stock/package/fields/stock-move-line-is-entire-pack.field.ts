import { defineField } from 'twenty-sdk/define';

import { appWritten, booleanField } from 'src/shared/fields';
import {
  STOCK_MOVE_LINE_OBJECT_UNIVERSAL_IDENTIFIER,
  STOCK_PACKAGE_INVERSE_FIELD_UNIVERSAL_IDENTIFIERS as RELATION_IDS,
} from 'src/stock/stock-universal-identifiers.constant';

export default defineField({
  ...appWritten(booleanField(RELATION_IDS.stockMoveLineIsEntirePack, 'isEntirePack', 'Is added through entire package', 'IconPackages', false)),
  objectUniversalIdentifier: STOCK_MOVE_LINE_OBJECT_UNIVERSAL_IDENTIFIER,
});
