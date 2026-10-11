import { describe, expect, it } from 'vitest';

import { pickedQuantity, planBackorderNeeded, planNoBackorder } from 'src/stock/utils/plan-backorder-needed.util';
import { type BackorderMove } from 'src/stock/utils/types/backorder-move.type';

const move = (overrides: Partial<BackorderMove> = {}): BackorderMove => ({
  state: 'ASSIGNED',
  productUomQty: 2,
  quantity: 2,
  picked: true,
  lines: [{ picked: true, quantityInMoveUnit: 2 }],
  ...overrides,
});

describe('pickedQuantity', () => {
  it('is the move quantity when every line is picked', () => {
    expect(pickedQuantity(move())).toBe(2);
  });

  it('sums only the picked lines when the move is picked and a line is not', () => {
    expect(
      pickedQuantity(
        move({ quantity: 5, lines: [{ picked: true, quantityInMoveUnit: 3 }, { picked: false, quantityInMoveUnit: 2 }] }),
      ),
    ).toBe(3);
  });

  it('is the move quantity for a move that is not picked', () => {
    expect(pickedQuantity(move({ picked: false, quantity: 4, lines: [{ picked: false, quantityInMoveUnit: 4 }] }))).toBe(4);
  });
});

describe('planBackorderNeeded', () => {
  it('asks when 1 of 2 is processed', () => {
    expect(
      planBackorderNeeded({ createBackorder: 'ASK', digits: 2, moves: [move({ quantity: 1, lines: [{ picked: true, quantityInMoveUnit: 1 }] })] }),
    ).toBe(true);
  });

  it('asks when a second move is not picked', () => {
    expect(
      planBackorderNeeded({
        createBackorder: 'ASK',
        digits: 2,
        moves: [move(), move({ picked: false, quantity: 0, lines: [] })],
      }),
    ).toBe(true);
  });

  it('does not ask when everything is picked in full', () => {
    expect(planBackorderNeeded({ createBackorder: 'ASK', digits: 2, moves: [move()] })).toBe(false);
  });

  it('ignores cancelled moves and an unpicked move with demand 0', () => {
    expect(
      planBackorderNeeded({
        createBackorder: 'ASK',
        digits: 2,
        moves: [move(), move({ state: 'CANCEL', picked: false, quantity: 0 }), move({ productUomQty: 0, quantity: 0, picked: false, lines: [] })],
      }),
    ).toBe(false);
  });

  it('never asks for ALWAYS or NEVER types', () => {
    const short = [move({ quantity: 1, lines: [{ picked: true, quantityInMoveUnit: 1 }] })];

    expect(planBackorderNeeded({ createBackorder: 'ALWAYS', digits: 2, moves: short })).toBe(false);
    expect(planBackorderNeeded({ createBackorder: 'NEVER', digits: 2, moves: short })).toBe(false);
  });
});

describe('planNoBackorder', () => {
  const pickings = [
    { id: 'ask', createBackorder: 'ASK' as const },
    { id: 'always', createBackorder: 'ALWAYS' as const },
    { id: 'never', createBackorder: 'NEVER' as const },
  ];

  it('is only the NEVER types when nobody answered or the answer was "create backorder"', () => {
    expect(planNoBackorder({ pickings, cancelBackorder: undefined })).toEqual(['never']);
    expect(planNoBackorder({ pickings, cancelBackorder: false })).toEqual(['never']);
  });

  it('adds every type but ALWAYS when the answer was "no backorder"', () => {
    expect(planNoBackorder({ pickings, cancelBackorder: true })).toEqual(['ask', 'never']);
  });
});
