import { type Records } from 'src/shared/triggers/records';
import { errorCollector } from 'src/shared/triggers/retry-on-conflict';
import { cascadeTargets } from 'src/shared/utils/cascade-targets.util';

export type CascadeChild = { of: Records; field: string };

// These rows are deleted with their parent. A soft delete
// cascades nothing in Twenty, so they go to the trash here, as app writes.
// Restore is not supported for them, so a parent restored later does not bring them back.
export const cascadeDelete = async ({
  parents,
  parentIds,
  children,
}: {
  parents: Records;
  parentIds: string[];
  children: CascadeChild[];
}) => {
  if (parentIds.length === 0) {
    return;
  }
  const stored = await parents.findIncludingDeleted<{ id: string; deletedAt: string | null }>(
    { id: { in: [...new Set(parentIds)] } },
    'id deletedAt',
  );
  const stillDeleted = stored.filter((parent) => parent.deletedAt !== null).map((parent) => parent.id);

  if (stillDeleted.length === 0) {
    return;
  }
  const errors = errorCollector();

  for (const { of, field } of children) {
    await errors.run(of.objectPlural, async () => {
      const rows = await of.find<Record<string, string | null> & { id: string }>(
        { [field]: { in: stillDeleted } },
        `id ${field}`,
      );
      await of.softDeleteMany(
        cascadeTargets({
          parents: stored,
          children: rows.map((row) => ({ id: row.id, parentId: row[field] })),
        }),
      );
    });
  }
  errors.throwIfAny();
};
