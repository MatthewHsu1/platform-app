import { resolveTree } from 'src/shared/utils/resolve-tree.util';

export const resolveCategories = (rows: { id: string; name: string; parentId: string | null }[]) => {
  const { chains, cycles } = resolveTree(rows);
  const resolved = new Map<string, { completeName: string; parentPath: string }>();

  for (const [id, chain] of chains) {
    resolved.set(id, {
      completeName: chain.map((link) => link.name).join(' / '),
      parentPath: `${chain.map((link) => link.id).join('/')}/`,
    });
  }

  return { resolved, cycles };
};

export const isCategoryUnder = (childPath: string | null, ancestorPath: string) =>
  childPath !== null && childPath.startsWith(ancestorPath);
