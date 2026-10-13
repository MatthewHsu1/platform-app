import { describe, expect, it } from 'vitest';

import { planCascadeRestore } from 'src/shared/utils/plan-cascade-restore.util';

describe('planCascadeRestore', () => {
  it('brings back the children deleted with the parent, not the ones deleted before it', () => {
    expect(
      planCascadeRestore({
        parents: [{ id: 'route', deletedAt: '2026-10-08T10:00:00.000Z' }],
        children: [
          { id: 'with-parent', parentId: 'route', deletedAt: '2026-10-08T10:00:03.000Z' },
          { id: 'before', parentId: 'route', deletedAt: '2026-10-07T09:00:00.000Z' },
          { id: 'other-parent', parentId: 'other', deletedAt: '2026-10-08T10:00:03.000Z' },
          { id: 'alive', parentId: 'route', deletedAt: null },
        ],
      }),
    ).toEqual(['with-parent']);
  });
});
