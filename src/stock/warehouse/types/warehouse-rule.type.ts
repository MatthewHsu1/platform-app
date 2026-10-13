import { type ObjectRecordEvent } from 'twenty-sdk/define';

import { type RecordOperation } from 'src/shared/triggers/batch-events';
import { type ErrorCollector } from 'src/shared/triggers/retry-on-conflict';
import { type WarehouseEventRecord } from 'src/stock/warehouse/types/warehouse-event-record.type';

export type WarehouseRule = (
  events: ObjectRecordEvent<WarehouseEventRecord>[],
  operation: RecordOperation,
  errors: ErrorCollector,
) => Promise<void>;
