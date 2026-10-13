import { describe, expect, it } from 'vitest';

import { planCompleteNames } from 'src/helpdesk/utils/plan-complete-names.util';

describe('planCompleteNames', () => {
  it('joins the names down the tree', () => {
    const { names, cycles } = planCompleteNames([
      { id: 'root', name: 'Root', parentId: null },
      { id: 'child', name: 'Child', parentId: 'root' },
      { id: 'grandchild', name: 'Grandchild', parentId: 'child' },
      { id: 'c2', name: 'C2', parentId: 'c1' },
      { id: 'c1', name: 'C1', parentId: null },
    ]);

    expect(names.get('root')).toBe('Root');
    expect(names.get('child')).toBe('Root / Child');
    expect(names.get('grandchild')).toBe('Root / Child / Grandchild');
    expect(names.get('c2')).toBe('C1 / C2');
    expect(cycles).toEqual([]);
  });

  it('finds the records that are their own parent through others', () => {
    const { names, cycles } = planCompleteNames([
      { id: 'a', name: 'A', parentId: 'b' },
      { id: 'b', name: 'B', parentId: 'a' },
      { id: 'c', name: 'C', parentId: 'a' },
    ]);

    expect(cycles.sort()).toEqual(['a', 'b', 'c']);
    expect(names.size).toBe(0);
  });
});
