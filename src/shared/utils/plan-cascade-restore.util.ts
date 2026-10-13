// Children to bring back with restored parents: the ones the parent's delete
// took with it, so deleted at or after the parent. A child deleted before
// its parent was deleted on purpose and stays deleted.
export const planCascadeRestore = ({
  parents,
  children,
}: {
  parents: { id: string; deletedAt: string }[];
  children: { id: string; parentId: string | null; deletedAt: string | null }[];
}) => {
  const deletedAtByParent = new Map(parents.map((parent) => [parent.id, parent.deletedAt]));

  return children
    .filter((child) => {
      const parentDeletedAt = child.parentId === null ? undefined : deletedAtByParent.get(child.parentId);

      return parentDeletedAt !== undefined && child.deletedAt !== null && child.deletedAt >= parentDeletedAt;
    })
    .map((child) => child.id);
};
