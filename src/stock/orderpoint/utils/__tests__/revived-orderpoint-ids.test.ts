import { describe, expect, it } from 'vitest';

import { revivedOrderpointIds } from 'src/stock/orderpoint/utils/revived-orderpoint-ids.util';

describe('revivedOrderpointIds', () => {
  it('takes every rule brought back from the trash', () => {
    expect(revivedOrderpointIds('restored', [{ recordId: 'op-1' }, { recordId: 'op-2' }])).toEqual(['op-1', 'op-2']);
  });

  it('takes a rule unarchived, and no other change', () => {
    expect(
      revivedOrderpointIds('updated', [
        { recordId: 'op-unarchived', before: { active: false }, after: { active: true } },
        { recordId: 'op-archived', before: { active: true }, after: { active: false } },
        { recordId: 'op-same', before: { active: true }, after: { active: true } },
      ]),
    ).toEqual(['op-unarchived']);
  });

  it('takes nothing from a new or deleted rule', () => {
    expect(revivedOrderpointIds('created', [{ recordId: 'op-1', after: { active: true } }])).toEqual([]);
    expect(revivedOrderpointIds('deleted', [{ recordId: 'op-1', before: { active: true } }])).toEqual([]);
  });
});
