import { planCompleteNames } from 'src/helpdesk/utils/plan-complete-names.util';

type TreeRow = { id: string; name: string | null; parentId: string | null; completeName: string | null };
type TreeSave = { id: string; staff: boolean; beforeParentId: string | null };

// A record may not sit under itself. A staff save that makes such a loop gets its old parent back;
// until the loop is gone no full name is written. The put-back's own echo is not undone again, because
// by then the stored parent is the old one.
export const planTreeSave = ({ rows, saves }: { rows: TreeRow[]; saves: TreeSave[] }) => {
  const { names, cycles } = planCompleteNames(rows);
  const cyclic = new Set(cycles);
  const stored = new Map(rows.map((row) => [row.id, row.parentId]));
  const putBacks = saves
    .filter((save) => save.staff && cyclic.has(save.id) && stored.get(save.id) !== save.beforeParentId)
    .map((save) => ({ id: save.id, parentId: save.beforeParentId }));

  if (putBacks.length > 0) {
    return { putBacks, names: [] };
  }

  return {
    putBacks,
    names: rows.flatMap((row) => {
      const completeName = names.get(row.id);

      return completeName === undefined || completeName === row.completeName ? [] : [{ id: row.id, completeName }];
    }),
  };
};
