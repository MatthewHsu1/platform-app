// The rows of a parent that is still deleted go with
// it. A parent restored meanwhile, or put back by a guard, keeps its rows.
export const cascadeTargets = ({
  parents,
  children,
}: {
  parents: { id: string; deletedAt: string | null }[];
  children: { id: string; parentId: string | null }[];
}) => {
  const deleted = new Set(
    parents.filter((parent) => parent.deletedAt !== null).map((parent) => parent.id),
  );

  return children
    .filter((child) => child.parentId !== null && deleted.has(child.parentId))
    .map((child) => child.id);
};
