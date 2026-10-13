import { describe, expect, it } from 'vitest';

import { type WaveLine } from 'src/stock-picking-batch/types/wave-line.type';
import { planAddToWave } from 'src/stock-picking-batch/utils/plan-add-to-wave.util';

const line = (id: string, pickingId: string, moveId: string, quantityProductUom = 1): WaveLine => ({
  id,
  pickingId,
  moveId,
  quantityProductUom,
});

// Transfer 1: product A (three lots of 5) and product B (five serials);
// transfer 2: product A (one lot of 5); transfer 3: product B (five serials).
const lines = [
  line('a1', 'p1', 'p1-A', 5),
  line('a2', 'p1', 'p1-A', 5),
  line('a3', 'p1', 'p1-A', 5),
  line('b1', 'p1', 'p1-B'),
  line('b2', 'p1', 'p1-B'),
  line('b3', 'p1', 'p1-B'),
  line('b4', 'p1', 'p1-B'),
  line('b5', 'p1', 'p1-B'),
  line('c1', 'p2', 'p2-A', 5),
  line('d1', 'p3', 'p3-B'),
  line('d2', 'p3', 'p3-B'),
  line('d3', 'p3', 'p3-B'),
  line('d4', 'p3', 'p3-B'),
  line('d5', 'p3', 'p3-B'),
];
const pickings = [
  { id: 'p1', lineIds: ['a1', 'a2', 'a3', 'b1', 'b2', 'b3', 'b4', 'b5'], moveIds: ['p1-A', 'p1-B'] },
  { id: 'p2', lineIds: ['c1'], moveIds: ['p2-A'] },
  { id: 'p3', lineIds: ['d1', 'd2', 'd3', 'd4', 'd5'], moveIds: ['p3-B'] },
];
const moves = [
  { id: 'p1-A', lineIds: ['a1', 'a2', 'a3'] },
  { id: 'p1-B', lineIds: ['b1', 'b2', 'b3', 'b4', 'b5'] },
  { id: 'p2-A', lineIds: ['c1'] },
  { id: 'p3-B', lineIds: ['d1', 'd2', 'd3', 'd4', 'd5'] },
];
const pick = (ids: string[]) => lines.filter((candidate) => ids.includes(candidate.id));

describe('planAddToWave', () => {
  it('puts transfers whose every line is chosen into the wave whole', () => {
    expect(planAddToWave({ lines, pickings, moves, digits: 2 })).toEqual({ wholePickingIds: ['p1', 'p2', 'p3'], splits: [] });
  });

  it('moves a move whose every line is chosen to a new transfer', () => {
    expect(planAddToWave({ lines: pick(['b1', 'b2', 'b3', 'b4', 'b5']), pickings, moves, digits: 2 })).toEqual({
      wholePickingIds: [],
      splits: [{ pickingId: 'p1', lineIds: ['b1', 'b2', 'b3', 'b4', 'b5'], wholeMoveIds: ['p1-B'], splitMoves: [] }],
    });
  });

  it('splits a move for the quantity of the chosen lines when only some of its lines are chosen', () => {
    expect(planAddToWave({ lines: pick(['d1', 'd2']), pickings, moves, digits: 2 })).toEqual({
      wholePickingIds: [],
      splits: [
        {
          pickingId: 'p3',
          lineIds: ['d1', 'd2'],
          wholeMoveIds: [],
          splitMoves: [{ moveId: 'p3-B', quantity: 2, lineIds: ['d1', 'd2'] }],
        },
      ],
    });
  });

  it('splits a transfer whose other move has no line instead of putting it in whole', () => {
    const emptyPickings = [{ id: 'p9', lineIds: ['e1'], moveIds: ['p9-empty', 'p9-full'] }];
    const emptyMoves = [
      { id: 'p9-empty', lineIds: [] },
      { id: 'p9-full', lineIds: ['e1'] },
    ];

    expect(
      planAddToWave({ lines: [line('e1', 'p9', 'p9-full', 5)], pickings: emptyPickings, moves: emptyMoves, digits: 2 }),
    ).toEqual({
      wholePickingIds: [],
      splits: [{ pickingId: 'p9', lineIds: ['e1'], wholeMoveIds: ['p9-full'], splitMoves: [] }],
    });
  });

  it('puts a transfer in whole when every line is chosen though a move is only partly reserved', () => {
    const partPickings = [{ id: 'p7', lineIds: ['f1', 'f2', 'g1'], moveIds: ['p7-A', 'p7-B'] }];
    const partMoves = [
      { id: 'p7-A', lineIds: ['f1', 'f2'] },
      { id: 'p7-B', lineIds: ['g1'] },
    ];
    const partLines = [line('f1', 'p7', 'p7-A', 5), line('f2', 'p7', 'p7-A', 5), line('g1', 'p7', 'p7-B', 5)];

    expect(planAddToWave({ lines: partLines, pickings: partPickings, moves: partMoves, digits: 2 })).toEqual({
      wholePickingIds: ['p7'],
      splits: [],
    });
  });

  it('keeps a transfer out whole when the chosen lines of a move add up to zero', () => {
    const zero = [{ ...lines[8], quantityProductUom: 0 }];

    expect(planAddToWave({ lines: zero, pickings, moves, digits: 2 })).toEqual({
      wholePickingIds: [],
      splits: [{ pickingId: 'p2', lineIds: ['c1'], wholeMoveIds: ['p2-A'], splitMoves: [] }],
    });
  });

  it('splits a move for 5 when one of its three lines of 5 is chosen', () => {
    const many = [line('m1', 'p8', 'p8-A', 5), line('m2', 'p8', 'p8-A', 5), line('m3', 'p8', 'p8-A', 5)];

    expect(
      planAddToWave({
        lines: [many[0]],
        pickings: [{ id: 'p8', lineIds: ['m1', 'm2', 'm3'], moveIds: ['p8-A'] }],
        moves: [{ id: 'p8-A', lineIds: ['m1', 'm2', 'm3'] }],
        digits: 2,
      }),
    ).toEqual({
      wholePickingIds: [],
      splits: [{ pickingId: 'p8', lineIds: ['m1'], wholeMoveIds: [], splitMoves: [{ moveId: 'p8-A', quantity: 5, lineIds: ['m1'] }] }],
    });
  });
});
