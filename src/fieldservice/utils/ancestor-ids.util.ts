// The parents of a record up to its root, nearest first. The walk stops where it meets a record twice, so a loop
// of parents ends it instead of running for ever.
export const ancestorIds = (recordId: string, parentById: ReadonlyMap<string, string | null>): string[] => {
  const ancestors: string[] = [];
  const seen = new Set<string>([recordId]);
  let parentId = parentById.get(recordId) ?? null;

  while (parentId !== null) {
    ancestors.push(parentId);
    if (seen.has(parentId)) {
      break;
    }
    seen.add(parentId);
    parentId = parentById.get(parentId) ?? null;
  }
  return ancestors;
};
