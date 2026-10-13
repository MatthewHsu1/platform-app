import { compareText } from 'src/shared/utils/compare-text.util';

type Node = { id: string; name: string; parentPackageId: string | null };

// For a package: the packages directly inside it (by name), and for any package, the set of it and
// every package below it. A loop in the data ends.
export const packageTree = (nodes: Node[]) => {
  const childrenOf = new Map<string, Node[]>();

  for (const node of nodes) {
    if (node.parentPackageId !== null) {
      childrenOf.set(node.parentPackageId, [...(childrenOf.get(node.parentPackageId) ?? []), node]);
    }
  }

  return {
    children: (packageId: string) =>
      [...(childrenOf.get(packageId) ?? [])].sort((left, right) => compareText(left.name, right.name) || compareText(left.id, right.id)),
    inside: (packageId: string) => {
      const found = new Set([packageId]);
      let level = [packageId];

      while (level.length > 0) {
        level = level.flatMap((id) => (childrenOf.get(id) ?? []).map((child) => child.id)).filter((id) => !found.has(id));
        level.forEach((id) => found.add(id));
      }
      return found;
    },
  };
};
