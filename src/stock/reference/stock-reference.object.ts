import { defineObject } from 'twenty-sdk/define';

import { oneToManyField, textField } from 'src/shared/fields';
import {
  STOCK_REFERENCE_FIELD_UNIVERSAL_IDENTIFIERS as FIELD_IDS,
  STOCK_REFERENCE_MOVE_REL_FIELD_UNIVERSAL_IDENTIFIERS,
  STOCK_REFERENCE_MOVE_REL_OBJECT_UNIVERSAL_IDENTIFIER,
  STOCK_REFERENCE_OBJECT_UNIVERSAL_IDENTIFIER,
} from 'src/stock/stock-universal-identifiers.constant';

// A document name that groups moves across transfers; sales and purchase
// orders link here later.
export default defineObject({
  universalIdentifier: STOCK_REFERENCE_OBJECT_UNIVERSAL_IDENTIFIER,
  nameSingular: 'stockReference',
  namePlural: 'stockReferences',
  labelSingular: 'Reference',
  labelPlural: 'References',
  description: 'A document name shared by the stock moves made for it',
  icon: 'IconLink',
  labelIdentifierFieldMetadataUniversalIdentifier: FIELD_IDS.name,
  fields: [
    textField(FIELD_IDS.name, 'name', 'Reference', 'IconHash'),
    oneToManyField({
      universalIdentifier: FIELD_IDS.moves,
      name: 'moves',
      label: 'Moves',
      icon: 'IconArrowsExchange',
      targetObjectUniversalIdentifier: STOCK_REFERENCE_MOVE_REL_OBJECT_UNIVERSAL_IDENTIFIER,
      targetFieldUniversalIdentifier: STOCK_REFERENCE_MOVE_REL_FIELD_UNIVERSAL_IDENTIFIERS.reference,
      junctionTargetFieldUniversalIdentifier: STOCK_REFERENCE_MOVE_REL_FIELD_UNIVERSAL_IDENTIFIERS.move,
    }),
  ],
});
