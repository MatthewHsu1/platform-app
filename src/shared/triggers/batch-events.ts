import { type DatabaseEventBatchPayload, type ObjectRecordEvent } from 'twenty-sdk/define';

export type RecordOperation = 'created' | 'updated' | 'deleted' | 'restored' | 'destroyed' | 'upserted';

// The batch name is `<object>.<operation>`, so the operation lives on the
// batch, not on each event.
export const readEvents = <TRecord>(payload: DatabaseEventBatchPayload<ObjectRecordEvent<TRecord>>) => ({
  operation: payload.name.split('.')[1] as RecordOperation,
  events: payload.events,
});
