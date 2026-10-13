import { describe, expect, it } from 'vitest';

import { linkedMovesFor } from 'src/stock/utils/linked-moves.util';

const moves = [
  { id: 'out', state: 'WAITING', moveOrigIds: ['pack'] },
  { id: 'pack', state: 'ASSIGNED', moveOrigIds: ['pick'] },
  { id: 'pick', state: 'CONFIRMED', moveOrigIds: ['receipt'] },
  { id: 'receipt', state: 'DONE', moveOrigIds: [] },
];

describe('linkedMovesFor', () => {
  it('reserves the delivery and the moves of its chain that still wait', () => {
    expect(linkedMovesFor({ moveId: 'out', moves, action: 'reserve' })).toEqual(['out', 'pick']);
  });

  it('unreserves the delivery and the moves of its chain that are not done', () => {
    expect(linkedMovesFor({ moveId: 'out', moves, action: 'unreserve' })).toEqual(['out', 'pack', 'pick']);
  });

  it('skips draft and cancelled moves either way', () => {
    const chain = [
      { id: 'out', state: 'CONFIRMED', moveOrigIds: ['a', 'b'] },
      { id: 'a', state: 'DRAFT', moveOrigIds: [] },
      { id: 'b', state: 'CANCEL', moveOrigIds: [] },
    ];

    expect(linkedMovesFor({ moveId: 'out', moves: chain, action: 'reserve' })).toEqual(['out']);
    expect(linkedMovesFor({ moveId: 'out', moves: chain, action: 'unreserve' })).toEqual(['out']);
  });
});
