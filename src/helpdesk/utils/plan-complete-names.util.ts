import { resolveTree } from 'src/shared/utils/resolve-tree.util';

export const planCompleteNames = (rows: { id: string; name: string | null; parentId: string | null }[]) => {
  const { chains, cycles } = resolveTree(rows);
  const names = new Map<string, string>();

  for (const [id, chain] of chains) {
    names.set(id, chain.map((link) => link.name ?? '').join(' / '));
  }

  return { names, cycles };
};
