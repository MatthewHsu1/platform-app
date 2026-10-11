import { type DatabaseEventBatchPayload, type ObjectRecordEvent } from 'twenty-sdk/define';

import { recordEmptyTextToNull } from 'src/shared/utils/empty-text-to-null.util';

export type RecordOperation = 'created' | 'updated' | 'deleted' | 'restored' | 'destroyed' | 'upserted';

// Event records carry "" for an empty TEXT field, like API reads; both read
// as null here so an event and a re-read row agree.
const withEmptyTextAsNull = <TRecord>(event: ObjectRecordEvent<TRecord>): ObjectRecordEvent<TRecord> => {
  const properties: Record<string, unknown> = { ...event.properties };

  for (const side of ['before', 'after'] as const) {
    if (side in properties) {
      properties[side] = recordEmptyTextToNull(properties[side]);
    }
  }
  return { ...event, properties } as ObjectRecordEvent<TRecord>;
};

// The batch name is `<object>.<operation>`, so the operation lives on the
// batch, not on each event.
export const readEvents = <TRecord>(payload: DatabaseEventBatchPayload<ObjectRecordEvent<TRecord>>) => ({
  operation: payload.name.split('.')[1] as RecordOperation,
  events: payload.events.map(withEmptyTextAsNull),
});
