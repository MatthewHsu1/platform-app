import { sameValue } from 'src/shared/utils/same-value.util';

// An empty text reads back as null, so it is sent as null: the next pass then finds it equal.
const storedForm = (value: unknown) => (value === '' ? null : value);

// The write a writer sends: only the values that differ from the stored row.
export const changedFields = (row: Record<string, unknown>, wanted: Record<string, unknown>) =>
  Object.fromEntries(
    Object.entries(wanted)
      .map(([field, value]) => [field, storedForm(value)] as const)
      .filter(([field, value]) => !sameValue(row[field], value)),
  );
