import { describe, expect, it } from 'vitest';

import { warehouseBatchFlags } from 'src/stock-picking-batch/utils/warehouse-batch-flags.util';

describe('warehouseBatchFlags', () => {
  it('a new warehouse batches its receipts and deliveries by contact', () => {
    expect(warehouseBatchFlags('inTypeId')).toEqual({ autoBatch: true, batchGroupByPartner: true });
    expect(warehouseBatchFlags('outTypeId')).toEqual({ autoBatch: true, batchGroupByPartner: true });
  });

  it('its internal types do not batch', () => {
    for (const field of ['intTypeId', 'pickTypeId', 'packTypeId', 'qcTypeId', 'storeTypeId', 'xdockTypeId']) {
      expect(warehouseBatchFlags(field)).toEqual({});
    }
  });
});
