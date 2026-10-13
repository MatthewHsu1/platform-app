import { defineField, OnDeleteAction } from 'twenty-sdk/define';

import { manyToOneField } from 'src/shared/fields';
import {
  ROUTING_INVERSE_FIELD_UNIVERSAL_IDENTIFIERS,
  STOCK_RULE_FIELD_UNIVERSAL_IDENTIFIERS,
  STOCK_RULE_OBJECT_UNIVERSAL_IDENTIFIER,
} from 'src/stock/routing-universal-identifiers.constant';
import { STOCK_MOVE_OBJECT_UNIVERSAL_IDENTIFIER } from 'src/stock/stock-universal-identifiers.constant';

export default defineField({
  ...manyToOneField({
    universalIdentifier: ROUTING_INVERSE_FIELD_UNIVERSAL_IDENTIFIERS.stockMoveRule,
    name: 'rule',
    label: 'Stock Rule',
    icon: 'IconArrowsSplit',
    onDelete: OnDeleteAction.RESTRICT,
    targetObjectUniversalIdentifier: STOCK_RULE_OBJECT_UNIVERSAL_IDENTIFIER,
    targetFieldUniversalIdentifier: STOCK_RULE_FIELD_UNIVERSAL_IDENTIFIERS.moves,
  }),
  objectUniversalIdentifier: STOCK_MOVE_OBJECT_UNIVERSAL_IDENTIFIER,
});
