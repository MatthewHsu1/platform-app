import { describe, expect, it } from 'vitest';

import {
  planScrapCheck,
  planScrapMove,
  planScrapName,
  planScrapProductChoices,
  planScrapQuantityRefusal,
} from 'src/stock/utils/plan-scrap.util';
import { type ScrapMoveInput } from 'src/stock/utils/types/scrap-move-input.type';

const check = (overrides: Partial<Parameters<typeof planScrapCheck>[0]>) =>
  planScrapCheck({
    state: 'DRAFT',
    scrapQty: 1,
    scrapQtyProductUom: 1,
    isStorable: true,
    onHandAtKey: 1,
    digits: 2,
    ...overrides,
  });

describe('planScrapCheck', () => {
  it('goes ahead when the exact location holds the quantity (1 on hand, scrap 1)', () => {
    expect(check({})).toEqual({ kind: 'proceed' });
  });

  it('asks when a dozen is scrapped from 1 unit on hand, in the product unit', () => {
    expect(check({ scrapQty: 1, scrapQtyProductUom: 12, onHandAtKey: 1 })).toEqual({
      kind: 'insufficient',
      quantityProductUom: 12,
    });
  });

  it('asks when the stock is only in a sub-location (10 on a shelf, 0 at Stock, scrap 5)', () => {
    expect(check({ scrapQty: 5, scrapQtyProductUom: 5, onHandAtKey: 0 })).toEqual({
      kind: 'insufficient',
      quantityProductUom: 5,
    });
  });

  it('never asks for a product that does not track inventory', () => {
    expect(check({ isStorable: false, onHandAtKey: 0 })).toEqual({ kind: 'proceed' });
  });

  it('refuses a zero quantity, a negative one, and a scrap already done', () => {
    expect(check({ scrapQty: 0, scrapQtyProductUom: 0 })).toEqual({
      kind: 'refuse',
      message: 'You can only enter positive quantities.',
    });
    expect(check({ scrapQty: 0.001, scrapQtyProductUom: 0.001 })).toEqual({
      kind: 'refuse',
      message: 'You can only enter positive quantities.',
    });
    expect(check({ scrapQty: -1, scrapQtyProductUom: -1 })).toEqual({
      kind: 'refuse',
      message: 'No negative quantities allowed',
    });
    expect(check({ state: 'DONE' })).toEqual({ kind: 'refuse', message: 'Only a draft scrap can be validated.' });
  });
});

describe('planScrapQuantityRefusal', () => {
  it('refuses a quantity that rounds to zero and a negative one, before any scrap exists', () => {
    expect(planScrapQuantityRefusal(0, 2)).toBe('You can only enter positive quantities.');
    expect(planScrapQuantityRefusal(0.004, 2)).toBe('You can only enter positive quantities.');
    expect(planScrapQuantityRefusal(-1, 2)).toBe('No negative quantities allowed');
    expect(planScrapQuantityRefusal(0.01, 2)).toBeNull();
  });
});

describe('planScrapName', () => {
  it('takes the next scrap number, else "New"', () => {
    expect(planScrapName('SP/00004')).toBe('SP/00004');
    expect(planScrapName(null)).toBe('New');
  });
});

describe('planScrapMove', () => {
  const scrap: ScrapMoveInput = {
    scrapId: 'scrap',
    origin: null,
    productId: 'product',
    productUomId: 'dozens',
    scrapQty: 1,
    scrapQtyProductUom: 12,
    locationId: 'stock',
    scrapLocationId: 'loss',
    lotId: null,
    packageId: null,
    ownerId: 'acme',
    pickingId: null,
  };

  it('takes the scrapped stock out of its package', () => {
    expect(
      planScrapMove({
        scrap: { ...scrap, packageId: 'box' },
        scrapName: 'SP/00001',
        pickingName: null,
        moveId: 'm',
        lineId: 'l',
        now: '2026-10-08T10:00:00.000Z',
      }).line,
    ).toMatchObject({ packageId: 'box', locationId: 'stock', locationDestId: 'loss' });
  });

  it('puts the scrapped lot on the line', () => {
    expect(
      planScrapMove({
        scrap: { ...scrap, lotId: 'lot1' },
        scrapName: 'SP/00001',
        pickingName: null,
        moveId: 'm',
        lineId: 'l',
        now: '2026-10-08T10:00:00.000Z',
      }).line,
    ).toMatchObject({ lotId: 'lot1', locationId: 'stock', locationDestId: 'loss' });
  });

  it('makes a picked draft move from the source into the scrap location, with one line', () => {
    expect(
      planScrapMove({ scrap, scrapName: 'SP/00001', pickingName: null, moveId: 'm', lineId: 'l', now: '2026-10-08T10:00:00.000Z' }),
    ).toEqual({
      move: {
        id: 'm',
        origin: 'SP/00001',
        productId: 'product',
        productUomId: 'dozens',
        state: 'DRAFT',
        productUomQty: 1,
        locationId: 'stock',
        locationDestId: 'loss',
        scrapId: 'scrap',
        picked: true,
        pickingId: null,
        procureMethod: 'MAKE_TO_STOCK',
        date: '2026-10-08T10:00:00.000Z',
      },
      line: {
        id: 'l',
        moveId: 'm',
        productId: 'product',
        productUomId: 'dozens',
        quantity: 1,
        quantityProductUom: 12,
        locationId: 'stock',
        locationDestId: 'loss',
        ownerId: 'acme',
        pickingId: null,
        picked: true,
        state: 'DRAFT',
        date: '2026-10-08T10:00:00.000Z',
      },
    });
  });

  it('takes the origin from the scrap, else the transfer name, else the scrap name', () => {
    const origin = (input: Partial<ScrapMoveInput>, pickingName: string | null) =>
      planScrapMove({ scrap: { ...scrap, ...input }, scrapName: 'SP/00001', pickingName, moveId: 'm', lineId: 'l', now: 'now' })
        .move.origin;

    expect(origin({ origin: 'Damaged in aisle 3' }, 'WH/OUT/00001')).toBe('Damaged in aisle 3');
    expect(origin({ pickingId: 'out' }, 'WH/OUT/00001')).toBe('WH/OUT/00001');
    expect(origin({}, null)).toBe('SP/00001');
  });
});

describe('planScrapProductChoices', () => {
  it('offers the goods of the transfer moves that are neither draft nor cancelled', () => {
    expect(
      planScrapProductChoices({
        moves: [
          { productId: 'chair', state: 'ASSIGNED' },
          { productId: 'chair', state: 'DONE' },
          { productId: 'table', state: 'DRAFT' },
          { productId: 'lamp', state: 'CANCEL' },
          { productId: 'install', state: 'CONFIRMED' },
        ],
        productTypes: new Map([
          ['chair', 'CONSU'],
          ['table', 'CONSU'],
          ['lamp', 'CONSU'],
          ['install', 'SERVICE'],
        ]),
      }),
    ).toEqual(['chair']);
  });
});
