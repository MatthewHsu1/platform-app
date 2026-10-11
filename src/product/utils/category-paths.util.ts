import { resolveTree } from 'src/shared/utils/resolve-tree.util';
import { textOrNull } from 'src/shared/utils/text-or-null.util';

export const resolveCategories = (rows: { id: string; name: string | null; parentId: string | null }[]) => {
  const { chains, cycles } = resolveTree(rows);
  const resolved = new Map<string, { completeName: string | null; parentPath: string }>();

  for (const [id, chain] of chains) {
    resolved.set(id, {
      completeName: textOrNull(chain.map((link) => link.name ?? '').join(' / ')),
      parentPath: `${chain.map((link) => link.id).join('/')}/`,
    });
  }

  return { resolved, cycles };
};

export const isCategoryUnder = (childPath: string | null, ancestorPath: string) =>
  childPath !== null && childPath.startsWith(ancestorPath);
