import { describe, expect, it } from 'vitest';

import { planTreeSave } from 'src/helpdesk/utils/plan-tree-save.util';

const row = (id: string, name: string, parentId: string | null, completeName: string | null = null) => ({ id, name, parentId, completeName });

describe('planTreeSave', () => {
  it('writes the full name of every record whose name or parent path changed', () => {
    const plan = planTreeSave({
      rows: [row('root', 'Root', null, 'Root'), row('child', 'Child', 'root', null), row('grandchild', 'Grandchild', 'child', 'Old / Grandchild')],
      saves: [{ id: 'child', staff: true, beforeParentId: null }],
    });

    expect(plan.putBacks).toEqual([]);
    expect(plan.names).toEqual([
      { id: 'child', completeName: 'Root / Child' },
      { id: 'grandchild', completeName: 'Root / Child / Grandchild' },
    ]);
  });

  it('puts back the parent a staff save chose when it makes the record its own ancestor', () => {
    const plan = planTreeSave({
      rows: [row('a', 'A', 'b', 'A'), row('b', 'B', 'a', 'A / B')],
      saves: [{ id: 'a', staff: true, beforeParentId: null }],
    });

    expect(plan.putBacks).toEqual([{ id: 'a', parentId: null }]);
    expect(plan.names).toEqual([]);
  });

  it('writes nothing more on the second pass', () => {
    const plan = planTreeSave({
      rows: [row('root', 'Root', null, 'Root'), row('child', 'Child', 'root', 'Root / Child')],
      saves: [{ id: 'child', staff: false, beforeParentId: 'root' }],
    });

    expect(plan).toEqual({ putBacks: [], names: [] });
  });

  it('leaves a loop made by the app alone', () => {
    const plan = planTreeSave({
      rows: [row('a', 'A', 'b', 'A'), row('b', 'B', 'a', 'A / B')],
      saves: [{ id: 'a', staff: false, beforeParentId: null }],
    });

    expect(plan.putBacks).toEqual([]);
  });
});
