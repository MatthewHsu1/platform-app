import { type ObjectRecordEvent } from 'twenty-sdk/define';

import { type RecordOperation } from 'src/shared/triggers/batch-events';
import { type ErrorCollector } from 'src/shared/triggers/retry-on-conflict';
import { type MoveLineEventRecord } from 'src/stock/move-line/types/move-line-event-record.type';
import { recomputePickingState } from 'src/stock/picking/recompute-picking-state';
import { eventAfter, eventBefore, eventChangedFields } from 'src/stock/stock-event-helpers';

// The line values a transfer's shipping weight is made of.
const WEIGHED_FIELDS: (keyof MoveLineEventRecord & string)[] = [
  'pickingId',
  'productId',
  'productUomId',
  'quantity',
  'quantityProductUom',
  'resultPackageId',
];

// A line that comes, goes, or changes what it weighs or which package it goes
// into weighs its transfers again, whoever made the change. The weight lives
// on the transfer, so this writes no line and a second pass finds nothing.
export const handleShippingWeightDependencies = async (
  events: ObjectRecordEvent<MoveLineEventRecord>[],
  operation: RecordOperation,
  errors: ErrorCollector,
) => {
  const touched = operation === 'updated' ? events.filter((event) => eventChangedFields(event, WEIGHED_FIELDS).length > 0) : events;
  const pickingIds = [
    ...new Set(touched.flatMap((event) => [eventBefore(event)?.pickingId, eventAfter(event)?.pickingId].flatMap((id) => id ?? []))),
  ];

  if (pickingIds.length > 0) {
    await errors.run('shipping weight', () => recomputePickingState(pickingIds));
  }
};
