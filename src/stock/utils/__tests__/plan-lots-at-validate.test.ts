import { describe, expect, it } from 'vitest';

import { translate } from 'src/shared/i18n/translate';
import {
  lotKey,
  lotMissingAtDoneRefusal,
  planLotsAtValidate,
  planSanityLotsMissing,
  selectLinesToBeDone,
} from 'src/stock/utils/plan-lots-at-validate.util';
import { type SanityLotLine } from 'src/stock/utils/types/sanity-lot-line.type';
import { type TrackingRefusal } from 'src/stock/utils/types/tracking-refusal.type';
import { type ValidateLotLine } from 'src/stock/utils/types/validate-lot-line.type';
import { type ValidateMove } from 'src/stock/utils/types/validate-move.type';

const text = (refusal: TrackingRefusal | null) => (refusal === null ? null : translate(null, refusal.message, refusal.values));

const line = (fields: Partial<ValidateLotLine>): ValidateLotLine => ({
  id: 'l1',
  productId: 'p',
  productName: 'Product B',
  tracking: 'LOT',
  quantity: 1,
  lotId: null,
  lotName: null,
  expirationDate: null,
  hasPickingType: true,
  useCreateLots: true,
  useExistingLots: false,
  isInventory: false,
  isScrap: false,
  ...fields,
});

describe('planLotsAtValidate', () => {
  it('makes the lot a receipt line names', () => {
    expect(planLotsAtValidate([line({ lotName: 'sn_test' })], new Map())).toEqual({
      missingProductNames: [],
      missingLineIds: [],
      assign: [],
      create: [{ productId: 'p', name: 'sn_test', expirationDate: null, lineIds: ['l1'] }],
    });
  });

  it('uses the lot that already has the name', () => {
    expect(planLotsAtValidate([line({ lotName: 'abc' })], new Map([[lotKey('p', 'abc'), 'lot-abc']])).assign).toEqual([
      { lineId: 'l1', lotId: 'lot-abc' },
    ]);
  });

  it('makes one lot per name for lots and one per line for serials', () => {
    const lots = planLotsAtValidate(
      [line({ id: 'a', lotName: 'L1', quantity: 2 }), line({ id: 'b', lotName: 'L1', quantity: 3 })],
      new Map(),
    );
    const serials = planLotsAtValidate(
      [line({ id: 'a', tracking: 'SERIAL', lotName: 'S1' }), line({ id: 'b', tracking: 'SERIAL', lotName: 'S1' })],
      new Map(),
    );

    expect(lots.create).toEqual([{ productId: 'p', name: 'L1', expirationDate: null, lineIds: ['a', 'b'] }]);
    expect(serials.create.map((lot) => lot.lineIds)).toEqual([['a'], ['b']]);
  });

  it('gives a new lot the expiration date of the line it is made from', () => {
    expect(
      planLotsAtValidate([line({ lotName: 'L1', expirationDate: '2026-11-01T00:00:00.000Z' })], new Map()).create[0]
        .expirationDate,
    ).toBe('2026-11-01T00:00:00.000Z');
  });

  it('refuses a tracked line without a name when the type makes lots, and any line without a lot when it only picks existing ones', () => {
    expect(planLotsAtValidate([line({})], new Map())).toMatchObject({ missingProductNames: ['Product B'], missingLineIds: ['l1'] });
    expect(
      planLotsAtValidate([line({ useCreateLots: false, useExistingLots: true, lotName: 'typed' })], new Map()).missingProductNames,
    ).toEqual(['Product B']);
  });

  it('lets a line through when the type neither makes nor picks lots, or it already has a lot', () => {
    expect(planLotsAtValidate([line({ useCreateLots: false, useExistingLots: false })], new Map()).missingProductNames).toEqual([]);
    expect(planLotsAtValidate([line({ lotId: 'x' })], new Map())).toEqual({ missingProductNames: [], missingLineIds: [], assign: [], create: [] });
  });

  it('ignores untracked products and empty lines', () => {
    expect(planLotsAtValidate([line({ tracking: 'NONE' }), line({ quantity: 0 })], new Map()).missingProductNames).toEqual([]);
  });

  it('refuses a tracked line with no operation type, unless it is a count or a scrap', () => {
    expect(planLotsAtValidate([line({ hasPickingType: false })], new Map()).missingProductNames).toEqual(['Product B']);
    expect(planLotsAtValidate([line({ hasPickingType: false, isInventory: true })], new Map()).missingProductNames).toEqual([]);
    expect(planLotsAtValidate([line({ hasPickingType: false, isScrap: true })], new Map()).missingProductNames).toEqual([]);
  });
});

describe('lotMissingAtDoneRefusal', () => {
  it('lists each product on its own line', () => {
    expect(text(lotMissingAtDoneRefusal(['Apple', 'Pear']))).toBe(
      'You need to supply a Lot/Serial Number for product:\n- Apple\n- Pear',
    );
  });
});

describe('planSanityLotsMissing', () => {
  const sanity = (fields: Partial<SanityLotLine>): SanityLotLine => ({
    pickingId: 't1',
    pickingName: 'WH/IN/1',
    productName: 'Apple',
    tracking: 'LOT',
    quantity: 1,
    picked: true,
    pickingUsesLots: true,
    lotId: null,
    lotName: null,
    ...fields,
  });

  it('names the products, and the transfers when several are validated', () => {
    const lines = [sanity({}), sanity({ pickingId: 't2', pickingName: 'WH/IN/2', productName: 'Pear' })];

    expect(text(planSanityLotsMissing(lines, false))).toBe('You need to supply a Lot/Serial number for products Apple, Pear.');
    expect(text(planSanityLotsMissing(lines, true))).toBe(
      'Transfers WH/IN/1, WH/IN/2: You need to supply a Lot/Serial number for products Apple, Pear.',
    );
  });

  it('accepts a typed name, and looks only at picked lines with a quantity of transfers whose type uses lots', () => {
    expect(
      planSanityLotsMissing(
        [
          sanity({ lotName: 'L1' }),
          sanity({ picked: false }),
          sanity({ quantity: 0 }),
          sanity({ pickingUsesLots: false }),
          sanity({ tracking: 'NONE' }),
        ],
        false,
      ),
    ).toBeNull();
  });
});

describe('selectLinesToBeDone', () => {
  const UOMS = new Map([['unit', { id: 'unit', name: 'Units', factor: 1, rootId: 'unit', parentPath: 'unit/' }]]);
  const move = (fields: Partial<ValidateMove> & { id: string }): ValidateMove => ({
    pickingId: 't',
    state: 'ASSIGNED',
    quantity: 1,
    productUomQty: 1,
    picked: false,
    toInventory: false,
    isInventory: false,
    productUomId: 'unit',
    ...fields,
  });
  const doneLine = (id: string, moveId: string, fields: Partial<{ quantity: number; picked: boolean }> = {}) => ({
    id,
    moveId,
    quantity: 1,
    picked: false,
    productUomId: 'unit',
    ...fields,
  });
  const select = (moves: ValidateMove[], lines: ReturnType<typeof doneLine>[]) =>
    selectLinesToBeDone({ moves, lines, uoms: UOMS, digits: 2 }).map((row) => row.id);

  it('takes only picked lines of picked moves once anything in the transfer is picked', () => {
    expect(
      select(
        [move({ id: 'm', picked: true, quantity: 2 }), move({ id: 'n' })],
        [doneLine('a', 'm', { picked: true }), doneLine('b', 'm'), doneLine('c', 'n')],
      ),
    ).toEqual(['a']);
  });

  it('takes every line with a quantity of a live move when nothing is picked', () => {
    expect(
      select(
        [move({ id: 'm', quantity: 1 }), move({ id: 'x', state: 'CANCEL' })],
        [doneLine('a', 'm'), doneLine('b', 'm', { quantity: 0 }), doneLine('c', 'x')],
      ),
    ).toEqual(['a']);
  });

  it('does not count a picked move into an inventory location as a pick', () => {
    expect(
      select(
        [move({ id: 's', picked: true, toInventory: true }), move({ id: 'm' })],
        [doneLine('a', 's', { picked: true }), doneLine('b', 'm')],
      ),
    ).toEqual(['a', 'b']);
  });

  it('keeps a picked move without lines deciding: the other moves stay out', () => {
    expect(select([move({ id: 'p', picked: true, quantity: 0 }), move({ id: 'm' })], [doneLine('a', 'm')])).toEqual([]);
  });
});
