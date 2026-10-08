import { describe, expect, it } from 'vitest';

import { cascadeTargets } from 'src/shared/utils/cascade-targets.util';

describe('cascadeTargets', () => {
  it('takes the rows of a parent still in the trash', () => {
    expect(
      cascadeTargets({
        parents: [{ id: 'list', deletedAt: '2026-10-08T10:00:00Z' }],
        children: [
          { id: 'rule-1', parentId: 'list' },
          { id: 'rule-2', parentId: 'list' },
        ],
      }),
    ).toEqual(['rule-1', 'rule-2']);
  });

  it('leaves the rows of a parent that came back', () => {
    expect(
      cascadeTargets({
        parents: [
          { id: 'kept', deletedAt: null },
          { id: 'gone', deletedAt: '2026-10-08T10:00:00Z' },
        ],
        children: [
          { id: 'child-of-kept', parentId: 'kept' },
          { id: 'child-of-gone', parentId: 'gone' },
          { id: 'root', parentId: null },
        ],
      }),
    ).toEqual(['child-of-gone']);
  });
});
