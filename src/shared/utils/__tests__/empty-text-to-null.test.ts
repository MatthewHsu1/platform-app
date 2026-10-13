import { describe, expect, it } from 'vitest';

import { emptyTextToNull } from 'src/shared/utils/empty-text-to-null.util';

// Twenty's API answers "" for a TEXT field whose column is NULL (seen live on stockMove.procurementRun).
describe('emptyTextToNull', () => {
  it('reads every empty text field of a row as no value', () => {
    expect(
      emptyTextToNull([{ id: 'm1', origin: '', procurementRun: '', name: 'WH/IN/00001', quantity: 0 }], 'id origin procurementRun name quantity'),
    ).toEqual([{ id: 'm1', origin: null, procurementRun: null, name: 'WH/IN/00001', quantity: 0 }]);
  });

  it('reads empty text inside a selected relation or composite as no value', () => {
    expect(
      emptyTextToNull(
        [{ id: 'l1', partner: { name: '' }, note: { blocknote: '', markdown: '' } }],
        'id partner { name } note { blocknote markdown }',
      ),
    ).toEqual([{ id: 'l1', partner: { name: null }, note: { blocknote: null, markdown: null } }]);
  });

  it('reads empty text in each node of a selected list', () => {
    expect(
      emptyTextToNull(
        [{ id: 'p1', moves: { edges: [{ node: { id: 'm1', origin: '' } }] } }],
        'id moves { edges { node { id origin } } }',
      ),
    ).toEqual([{ id: 'p1', moves: { edges: [{ node: { id: 'm1', origin: null } }] } }]);
  });

  it('leaves the inside of a JSON field and the items of a list field as stored', () => {
    const progress = { steps: { plan: { origin: '' } } };

    expect(
      emptyTextToNull([{ id: 'c1', progress, tags: ['', 'a'] }], 'id progress tags'),
    ).toEqual([{ id: 'c1', progress: { steps: { plan: { origin: '' } } }, tags: ['', 'a'] }]);
  });

  it('reads an aliased field under its alias', () => {
    expect(emptyTextToNull([{ id: 'w1', title: '' }], 'id title: name')).toEqual([{ id: 'w1', title: null }]);
  });
});
