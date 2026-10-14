import { defineField } from 'twenty-sdk/define';

import {
  FIELDSERVICE_STOCK_FIELD_UNIVERSAL_IDENTIFIERS,
} from 'src/fieldservice-stock/fieldservice-stock-universal-identifiers.constant';
import { FSM_ORDER_OBJECT_UNIVERSAL_IDENTIFIER } from 'src/fieldservice/fieldservice-universal-identifiers.constant';
import { oneToManyField } from 'src/shared/fields';
import { STOCK_MOVE_OBJECT_UNIVERSAL_IDENTIFIER } from 'src/stock/stock-universal-identifiers.constant';

export default defineField({
  ...oneToManyField({
    universalIdentifier: FIELDSERVICE_STOCK_FIELD_UNIVERSAL_IDENTIFIERS.fsmOrderMoves,
    name: 'moves',
    label: 'Operations',
    icon: 'IconArrowsExchange',
    targetObjectUniversalIdentifier: STOCK_MOVE_OBJECT_UNIVERSAL_IDENTIFIER,
    targetFieldUniversalIdentifier: FIELDSERVICE_STOCK_FIELD_UNIVERSAL_IDENTIFIERS.stockMoveFsmOrder,
  }),
  objectUniversalIdentifier: FSM_ORDER_OBJECT_UNIVERSAL_IDENTIFIER,
});
