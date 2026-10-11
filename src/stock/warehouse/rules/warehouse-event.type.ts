import { type ObjectRecordEvent } from 'twenty-sdk/define';

import { type WarehouseEventRecord } from 'src/stock/warehouse/types/warehouse-event-record.type';

export const eventValues = (event: ObjectRecordEvent<WarehouseEventRecord>) => ({
  before: 'before' in event.properties ? (event.properties.before as WarehouseEventRecord | undefined) : undefined,
  after: 'after' in event.properties ? (event.properties.after as WarehouseEventRecord | undefined) : undefined,
});
