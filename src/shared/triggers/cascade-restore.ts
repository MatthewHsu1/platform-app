import { type CascadeChild } from 'src/shared/triggers/cascade-delete';
import { type Records } from 'src/shared/triggers/records';
import { planCascadeRestore } from 'src/shared/utils/plan-cascade-restore.util';

// Another trigger on the same delete may have put the record back already;
// what goes with a delete applies only to records still deleted.
export const stillDeletedIds = async (parents: Records, ids: string[]) => {
  if (ids.length === 0) {
    return [];
  }
  const stored = await parents.findIncludingDeleted<{ id: string; deletedAt: string | null }>(
    { id: { in: [...new Set(ids)] } },
    'id deletedAt',
  );

  return stored.filter((parent) => parent.deletedAt !== null).map((parent) => parent.id);
};

// Restoring a parent brings back the children its delete took with it.
export const restoreCascaded = async ({
  parents,
  children,
}: {
  parents: { id: string; deletedAt: string | null }[];
  children: CascadeChild[];
}) => {
  const deletedParents = parents.flatMap((parent) =>
    parent.deletedAt === null ? [] : [{ id: parent.id, deletedAt: parent.deletedAt }],
  );

  if (deletedParents.length === 0) {
    return;
  }
  for (const { of, field } of children) {
    const rows = await of.findIncludingDeleted<Record<string, string | null> & { id: string; deletedAt: string | null }>(
      { [field]: { in: deletedParents.map((parent) => parent.id) } },
      `id ${field} deletedAt`,
    );
    const ids = planCascadeRestore({
      parents: deletedParents,
      children: rows.map((row) => ({ id: row.id, parentId: row[field], deletedAt: row.deletedAt })),
    });

    if (ids.length > 0) {
      await of.restoreMany(ids);
    }
  }
};

// Link rows of deleted records go for good, so the same link can be made again.
export const destroyLinksOf = async (links: Records, field: string, parentIds: string[]) => {
  if (parentIds.length === 0) {
    return;
  }
  const rows = await links.findIncludingDeleted<{ id: string }>({ [field]: { in: parentIds } }, 'id');

  if (rows.length > 0) {
    await links.destroyMany(rows.map((row) => row.id));
  }
};

// The end state of a set-null relation once its target is deleted.
export const clearReferences = async (of: Records, field: string, targetIds: string[]) => {
  if (targetIds.length === 0) {
    return;
  }
  const rows = await of.find<{ id: string }>({ [field]: { in: targetIds } }, 'id');

  if (rows.length > 0) {
    await of.updateMany(
      rows.map((row) => row.id),
      { [field]: null },
    );
  }
};
