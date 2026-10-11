import { defineObject, OnDeleteAction } from 'twenty-sdk/define';

import { manyToOneField } from 'src/shared/fields';
import {
  STOCK_MOVE_FIELD_UNIVERSAL_IDENTIFIERS,
  STOCK_MOVE_OBJECT_UNIVERSAL_IDENTIFIER,
  STOCK_REFERENCE_FIELD_UNIVERSAL_IDENTIFIERS,
  STOCK_REFERENCE_MOVE_REL_FIELD_UNIVERSAL_IDENTIFIERS as FIELD_IDS,
  STOCK_REFERENCE_MOVE_REL_OBJECT_UNIVERSAL_IDENTIFIER,
  STOCK_REFERENCE_OBJECT_UNIVERSAL_IDENTIFIER,
} from 'src/stock/stock-universal-identifiers.constant';

export default defineObject({
  universalIdentifier: STOCK_REFERENCE_MOVE_REL_OBJECT_UNIVERSAL_IDENTIFIER,
  nameSingular: 'stockReferenceMoveRel',
  namePlural: 'stockReferenceMoveRels',
  labelSingular: 'Reference link',
  labelPlural: 'Reference links',
  description: 'Puts a reference on a stock move',
  icon: 'IconLink',
  fields: [
    manyToOneField({
      universalIdentifier: FIELD_IDS.reference,
      name: 'reference',
      label: 'Reference',
      icon: 'IconHash',
      onDelete: OnDeleteAction.CASCADE,
      targetObjectUniversalIdentifier: STOCK_REFERENCE_OBJECT_UNIVERSAL_IDENTIFIER,
      targetFieldUniversalIdentifier: STOCK_REFERENCE_FIELD_UNIVERSAL_IDENTIFIERS.moves,
    }),
    manyToOneField({
      universalIdentifier: FIELD_IDS.move,
      name: 'move',
      label: 'Stock move',
      icon: 'IconArrowsExchange',
      onDelete: OnDeleteAction.CASCADE,
      targetObjectUniversalIdentifier: STOCK_MOVE_OBJECT_UNIVERSAL_IDENTIFIER,
      targetFieldUniversalIdentifier: STOCK_MOVE_FIELD_UNIVERSAL_IDENTIFIERS.references,
    }),
  ],
});
