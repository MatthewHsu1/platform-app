import { describe, expect, it } from 'vitest';

import { resolveTree } from 'src/shared/utils/resolve-tree.util';

describe('resolveTree', () => {
  it('builds the chain from the root to each row', () => {
    const { chains, cycles } = resolveTree([
      { id: 'goods', parentId: null },
      { id: 'parts', parentId: 'goods' },
      { id: 'belts', parentId: 'parts' },
    ]);

    expect(cycles).toEqual([]);
    expect(chains.get('belts')?.map((row) => row.id)).toEqual(['goods', 'parts', 'belts']);
  });

  it('reports every row on or under a loop', () => {
    const { cycles } = resolveTree([
      { id: 'a', parentId: 'b' },
      { id: 'b', parentId: 'a' },
      { id: 'c', parentId: 'a' },
    ]);

    expect(cycles.sort()).toEqual(['a', 'b', 'c']);
  });

  it('treats a missing parent as a root', () => {
    const { chains } = resolveTree([{ id: 'x', parentId: 'gone' }]);

    expect(chains.get('x')?.map((row) => row.id)).toEqual(['x']);
  });
});
