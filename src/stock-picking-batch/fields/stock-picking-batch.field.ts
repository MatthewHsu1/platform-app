import { defineField, OnDeleteAction } from 'twenty-sdk/define';

import { manyToOneField } from 'src/shared/fields';
import {
  STOCK_PICKING_BATCH_FIELD_UNIVERSAL_IDENTIFIERS as FIELD_IDS,
  STOCK_PICKING_BATCH_INVERSE_FIELD_UNIVERSAL_IDENTIFIERS as INVERSE_IDS,
  STOCK_PICKING_BATCH_OBJECT_UNIVERSAL_IDENTIFIER,
} from 'src/stock-picking-batch/stock-picking-batch-universal-identifiers.constant';
import { STOCK_PICKING_OBJECT_UNIVERSAL_IDENTIFIER } from 'src/stock/stock-universal-identifiers.constant';

export default defineField({
  ...manyToOneField({
    universalIdentifier: INVERSE_IDS.pickingBatch,
    name: 'batch',
    label: 'Batch Transfer',
    icon: 'IconStack2',
    onDelete: OnDeleteAction.SET_NULL,
    targetObjectUniversalIdentifier: STOCK_PICKING_BATCH_OBJECT_UNIVERSAL_IDENTIFIER,
    targetFieldUniversalIdentifier: FIELD_IDS.pickings,
  }),
  objectUniversalIdentifier: STOCK_PICKING_OBJECT_UNIVERSAL_IDENTIFIER,
});
