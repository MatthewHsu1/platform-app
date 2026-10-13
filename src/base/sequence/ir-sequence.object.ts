import { defineObject, FieldType } from 'twenty-sdk/define';

import {
  IR_SEQUENCE_FIELD_UNIVERSAL_IDENTIFIERS as FIELD_IDS,
  IR_SEQUENCE_OBJECT_UNIVERSAL_IDENTIFIER,
} from 'src/base/base-universal-identifiers.constant';
import { activeField, numberField, oneToManyField, seedKeyField, textField } from 'src/shared/fields';
import {
  STOCK_PICKING_TYPE_FIELD_UNIVERSAL_IDENTIFIERS,
  STOCK_PICKING_TYPE_OBJECT_UNIVERSAL_IDENTIFIER,
} from 'src/stock/stock-universal-identifiers.constant';

export default defineObject({
  universalIdentifier: IR_SEQUENCE_OBJECT_UNIVERSAL_IDENTIFIER,
  nameSingular: 'irSequence',
  namePlural: 'irSequences',
  labelSingular: 'Sequence',
  labelPlural: 'Sequences',
  description: 'A numbering series: prefix, size and the next number',
  icon: 'IconListNumbers',
  labelIdentifierFieldMetadataUniversalIdentifier: FIELD_IDS.name,
  fields: [
    { universalIdentifier: FIELD_IDS.name, name: 'name', label: 'Name', icon: 'IconAbc', type: FieldType.TEXT },
    textField(FIELD_IDS.code, 'code', 'Sequence code', 'IconCode'),
    textField(FIELD_IDS.prefix, 'prefix', 'Prefix', 'IconAlignLeft'),
    numberField(FIELD_IDS.padding, 'padding', 'Sequence size', 'IconRuler', { decimals: 0, int: true, defaultValue: 0 }),
    numberField(FIELD_IDS.numberNext, 'numberNext', 'Next number', 'IconArrowRight', {
      decimals: 0,
      int: true,
      defaultValue: 1,
    }),
    numberField(FIELD_IDS.numberIncrement, 'numberIncrement', 'Step', 'IconPlus', {
      decimals: 0,
      int: true,
      defaultValue: 1,
    }),
    activeField(FIELD_IDS.active),
    seedKeyField(FIELD_IDS.seedKey),
    oneToManyField({
      universalIdentifier: FIELD_IDS.pickingTypes,
      name: 'pickingTypes',
      label: 'Operation types',
      icon: 'IconArrowsExchange',
      targetObjectUniversalIdentifier: STOCK_PICKING_TYPE_OBJECT_UNIVERSAL_IDENTIFIER,
      targetFieldUniversalIdentifier: STOCK_PICKING_TYPE_FIELD_UNIVERSAL_IDENTIFIERS.referenceSequence,
    }),
  ],
});
