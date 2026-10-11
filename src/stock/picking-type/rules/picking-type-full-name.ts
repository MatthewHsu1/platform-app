import { type ObjectRecordEvent } from 'twenty-sdk/define';

import { type RecordOperation } from 'src/shared/triggers/batch-events';
import { type ErrorCollector } from 'src/shared/triggers/retry-on-conflict';
import { recomputePickingTypeNames } from 'src/stock/picking-type/recompute-picking-type-names';
import { type PickingTypeEventRecord } from 'src/stock/picking-type/types/picking-type-event-record.type';
import { eventChangedFields } from 'src/stock/stock-event-helpers';

// App writes count too: the warehouse reconciler makes and renames types. The full-name
// write itself changes neither field, so it does not run this again.
export const handlePickingTypeFullName = async (
  events: ObjectRecordEvent<PickingTypeEventRecord>[],
  operation: RecordOperation,
  errors: ErrorCollector,
) => {
  const ids =
    operation === 'created' || operation === 'restored'
      ? events.map((event) => event.recordId)
      : operation === 'updated'
        ? events.filter((event) => eventChangedFields(event, ['name', 'warehouseId']).length > 0).map((event) => event.recordId)
        : [];

  if (ids.length > 0) {
    await errors.run('operation type full names', () => recomputePickingTypeNames({ id: { in: ids } }));
  }
};
