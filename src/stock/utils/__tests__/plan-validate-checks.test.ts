import { describe, expect, it } from 'vitest';

import {
  EMPTY_TRANSFER_MESSAGE,
  planLineRefusals,
  planPreDonePicked,
  planSanityCheck,
  ZERO_QUANTITY_MESSAGE,
} from 'src/stock/utils/plan-validate-checks.util';
import { type CheckMove } from 'src/stock/utils/types/check-move.type';
import { type CheckPicking } from 'src/stock/utils/types/check-picking.type';

const move = (overrides: Partial<CheckMove> = {}): CheckMove => ({
  id: 'm1',
  state: 'ASSIGNED',
  quantity: 2,
  productUomQty: 2,
  picked: false,
  isScrap: false,
  productName: 'Belt',
  uomName: 'Units',
  lines: [{ id: 'l1', quantity: 2, picked: false }],
  ...overrides,
});

const picking = (overrides: Partial<CheckPicking> = {}): CheckPicking => ({
  id: 'p1',
  name: 'WH/OUT/00001',
  moves: [move()],
  lineCount: 1,
  ...overrides,
});

describe('planSanityCheck', () => {
  it('refuses one transfer with no moves and no lines', () => {
    expect(planSanityCheck({ pickings: [picking({ moves: [], lineCount: 0 })], digits: 2, trackingMessages: [] })).toBe(
      EMPTY_TRANSFER_MESSAGE,
    );
  });

  it('refuses one transfer whose considered moves all have quantity 0', () => {
    expect(
      planSanityCheck({ pickings: [picking({ moves: [move({ quantity: 0, lines: [] })] })], digits: 2, trackingMessages: [] }),
    ).toBe(ZERO_QUANTITY_MESSAGE);
  });

  it('considers only the picked live moves when one move is picked', () => {
    const pickedEmpty = move({ id: 'm1', quantity: 0, picked: true, lines: [] });
    const unpickedFull = move({ id: 'm2', quantity: 5, picked: false });

    expect(
      planSanityCheck({ pickings: [picking({ moves: [pickedEmpty, unpickedFull] })], digits: 2, trackingMessages: [] }),
    ).toBe(ZERO_QUANTITY_MESSAGE);
  });

  it('treats a quantity below the precision as zero', () => {
    expect(
      planSanityCheck({ pickings: [picking({ moves: [move({ quantity: 0.004 })] })], digits: 2, trackingMessages: [] }),
    ).toBe(ZERO_QUANTITY_MESSAGE);
  });

  it('lets a transfer with a quantity through', () => {
    expect(planSanityCheck({ pickings: [picking()], digits: 2, trackingMessages: [] })).toBeNull();
  });

  it('joins the empty-transfer and lot messages for several transfers, without the zero-quantity check', () => {
    const empty = picking({ id: 'p2', name: 'WH/OUT/00002', moves: [], lineCount: 0 });
    const zero = picking({ id: 'p3', name: 'WH/OUT/00003', moves: [move({ quantity: 0, lines: [] })] });

    expect(
      planSanityCheck({ pickings: [picking(), empty, zero], digits: 2, trackingMessages: ['Lots are missing for Belt.'] }),
    ).toBe('Transfers WH/OUT/00002: Please add some items to move.\n\nLots are missing for Belt.');
  });

  it('passes the tracking messages of one transfer on', () => {
    expect(planSanityCheck({ pickings: [picking()], digits: 2, trackingMessages: ['Lots are missing for Belt.'] })).toBe(
      'Lots are missing for Belt.',
    );
  });
});

describe('planLineRefusals', () => {
  it('refuses a line quantity that does not round to itself at the precision', () => {
    expect(
      planLineRefusals({
        pickings: [picking({ moves: [move({ picked: true, lines: [{ id: 'l1', quantity: 1.234, picked: true }] })] })],
        digits: 2,
      }),
    ).toBe(
      'The quantity done for the product "Belt" doesn\'t respect the rounding precision defined on the unit of measure "Units". Please change the quantity done or the rounding precision of your unit of measure.',
    );
  });

  it('refuses a negative line quantity', () => {
    expect(
      planLineRefusals({ pickings: [picking({ moves: [move({ picked: true, lines: [{ id: 'l1', quantity: -1, picked: true }] })] })], digits: 2 }),
    ).toBe('No negative quantities allowed');
  });

  it('ignores a bad quantity on a line that will be dropped (unpicked line of a picked move, or an unpicked move)', () => {
    const droppedLine = move({
      picked: true,
      quantity: 2,
      lines: [
        { id: 'l1', quantity: 2, picked: true },
        { id: 'l2', quantity: 1.234, picked: false },
      ],
    });
    const unpickedMove = move({ id: 'm2', picked: false, lines: [{ id: 'l3', quantity: -5, picked: false }] });

    expect(planLineRefusals({ pickings: [picking({ moves: [droppedLine, unpickedMove] })], digits: 2 })).toBeNull();
  });

  it('ignores done and cancelled moves', () => {
    expect(
      planLineRefusals({
        pickings: [picking({ moves: [move({ state: 'DONE', lines: [{ id: 'l1', quantity: -1, picked: true }] })] })],
        digits: 2,
      }),
    ).toBeNull();
  });
});

describe('planPreDonePicked', () => {
  it('marks every move picked when some move has a quantity and none is picked', () => {
    expect(planPreDonePicked(picking({ moves: [move({ id: 'a' }), move({ id: 'b', quantity: 0 })] }))).toEqual(['a', 'b']);
  });

  it('marks nothing when a move is already picked', () => {
    expect(planPreDonePicked(picking({ moves: [move({ id: 'a', picked: true }), move({ id: 'b' })] }))).toEqual([]);
  });

  it('ignores a picked scrap move when deciding, but marks it too', () => {
    expect(planPreDonePicked(picking({ moves: [move({ id: 'a' }), move({ id: 's', isScrap: true, picked: true })] }))).toEqual([
      'a',
      's',
    ]);
  });

  it('marks nothing when no move has a quantity', () => {
    expect(planPreDonePicked(picking({ moves: [move({ quantity: 0 })] }))).toEqual([]);
  });
});
