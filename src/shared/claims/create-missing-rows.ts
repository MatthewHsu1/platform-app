import { type Records } from 'src/shared/triggers/records';

// A journal step creates rows with ids chosen in its plan; a rerun of the step
// creates only the ones that are not there yet.
export const createMissingRows = async (
  of: Pick<Records, 'findIncludingDeleted' | 'createMany'>,
  rows: { id: string; data: Record<string, unknown> }[],
) => {
  if (rows.length === 0) {
    return [];
  }
  const stored = await of.findIncludingDeleted<{ id: string }>({ id: { in: rows.map((row) => row.id) } }, 'id');
  const existing = new Set(stored.map((row) => row.id));
  const missing = rows.filter((row) => !existing.has(row.id));

  if (missing.length > 0) {
    await of.createMany(missing.map((row) => ({ id: row.id, ...row.data })));
  }

  return missing.map((row) => row.id);
};
