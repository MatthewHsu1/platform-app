import { defineField, STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS } from 'twenty-sdk/define';

import { oneToManyField } from 'src/shared/fields';
import {
  STOCK_PICKING_BATCH_FIELD_UNIVERSAL_IDENTIFIERS as FIELD_IDS,
  STOCK_PICKING_BATCH_INVERSE_FIELD_UNIVERSAL_IDENTIFIERS as INVERSE_IDS,
  STOCK_PICKING_BATCH_OBJECT_UNIVERSAL_IDENTIFIER,
} from 'src/stock-picking-batch/stock-picking-batch-universal-identifiers.constant';

export default defineField({
  ...oneToManyField({
    universalIdentifier: INVERSE_IDS.workspaceMemberBatches,
    name: 'stockPickingBatches',
    label: 'Batch transfers',
    icon: 'IconStack2',
    targetObjectUniversalIdentifier: STOCK_PICKING_BATCH_OBJECT_UNIVERSAL_IDENTIFIER,
    targetFieldUniversalIdentifier: FIELD_IDS.responsible,
  }),
  objectUniversalIdentifier: STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.workspaceMember.universalIdentifier,
});
