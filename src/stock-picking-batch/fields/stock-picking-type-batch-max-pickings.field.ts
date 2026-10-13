import { defineField } from 'twenty-sdk/define';

import { numberField } from 'src/shared/fields';
import { STOCK_PICKING_BATCH_INVERSE_FIELD_UNIVERSAL_IDENTIFIERS as INVERSE_IDS } from 'src/stock-picking-batch/stock-picking-batch-universal-identifiers.constant';
import { STOCK_PICKING_TYPE_OBJECT_UNIVERSAL_IDENTIFIER } from 'src/stock/stock-universal-identifiers.constant';

export default defineField({
  ...numberField(INVERSE_IDS.batchMaxPickings, 'batchMaxPickings', 'Maximum transfers', 'IconListNumbers', { int: true, decimals: 0, defaultValue: 0 }),
  objectUniversalIdentifier: STOCK_PICKING_TYPE_OBJECT_UNIVERSAL_IDENTIFIER,
});
