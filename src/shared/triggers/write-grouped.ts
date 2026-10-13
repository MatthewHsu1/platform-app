import { type Records } from 'src/shared/triggers/records';

// Rows given the same values are written together.
export const writeGrouped = async (rows: Records, updates: { id: string; data: Record<string, unknown> }[]) => {
  const idsByData = new Map<string, { data: Record<string, unknown>; ids: string[] }>();

  for (const { id, data } of updates) {
    const key = JSON.stringify(data);
    const group = idsByData.get(key) ?? { data, ids: [] };

    group.ids.push(id);
    idsByData.set(key, group);
  }
  for (const { data, ids } of idsByData.values()) {
    await rows.updateMany(ids, data);
  }
};
