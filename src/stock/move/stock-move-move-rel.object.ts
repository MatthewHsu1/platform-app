import { defineObject, OnDeleteAction } from 'twenty-sdk/define';

import { manyToOneField } from 'src/shared/fields';
import {
  STOCK_MOVE_FIELD_UNIVERSAL_IDENTIFIERS,
  STOCK_MOVE_MOVE_REL_FIELD_UNIVERSAL_IDENTIFIERS as FIELD_IDS,
  STOCK_MOVE_MOVE_REL_OBJECT_UNIVERSAL_IDENTIFIER,
  STOCK_MOVE_OBJECT_UNIVERSAL_IDENTIFIER,
} from 'src/stock/stock-universal-identifiers.constant';

// One row chains an original move to a destination move.
export default defineObject({
  universalIdentifier: STOCK_MOVE_MOVE_REL_OBJECT_UNIVERSAL_IDENTIFIER,
  nameSingular: 'stockMoveMoveRel',
  namePlural: 'stockMoveMoveRels',
  labelSingular: 'Move chain link',
  labelPlural: 'Move chain links',
  description: 'Chains an original stock move to the move that continues it',
  icon: 'IconLink',
  fields: [
    manyToOneField({
      universalIdentifier: FIELD_IDS.moveOrig,
      name: 'moveOrig',
      label: 'Original move',
      icon: 'IconArrowLeft',
      onDelete: OnDeleteAction.CASCADE,
      targetObjectUniversalIdentifier: STOCK_MOVE_OBJECT_UNIVERSAL_IDENTIFIER,
      targetFieldUniversalIdentifier: STOCK_MOVE_FIELD_UNIVERSAL_IDENTIFIERS.moveDests,
    }),
    manyToOneField({
      universalIdentifier: FIELD_IDS.moveDest,
      name: 'moveDest',
      label: 'Destination move',
      icon: 'IconArrowRight',
      onDelete: OnDeleteAction.CASCADE,
      targetObjectUniversalIdentifier: STOCK_MOVE_OBJECT_UNIVERSAL_IDENTIFIER,
      targetFieldUniversalIdentifier: STOCK_MOVE_FIELD_UNIVERSAL_IDENTIFIERS.moveOrigs,
    }),
  ],
});
