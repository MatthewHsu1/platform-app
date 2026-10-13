import { type ObjectRecordEvent } from 'twenty-sdk/define';

// The fields a save changed. Twenty lists a relation under both its name and
// its join column; a create, delete or destroy lists none.
export const updatedFieldsOf = <TRecord>(event: ObjectRecordEvent<TRecord>): string[] =>
  'updatedFields' in event.properties ? (event.properties.updatedFields ?? []) : [];
