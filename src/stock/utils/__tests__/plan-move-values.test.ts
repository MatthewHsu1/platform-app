import { describe, expect, it } from 'vitest';

import { planLineValues, planMoveValues } from 'src/stock/utils/plan-move-values.util';
import { type MoveValuesInput } from 'src/stock/utils/types/move-values-input.type';
import { type ResolvedUom } from 'src/uom/utils/types/resolved-uom.type';

const unit = (id: string, factor: number): ResolvedUom => ({ id, name: id, factor, rootId: 'units', parentPath: `units/${id}/` });
const UOMS = new Map([
  ['units', unit('units', 1)],
  ['dozens', unit('dozens', 12)],
]);

const input = (overrides: Partial<MoveValuesInput> = {}): MoveValuesInput => ({
  move: {
    state: 'CONFIRMED',
    date: '2026-10-20T15:00:00.000Z',
    productUomQty: 10,
    priority: 'NORMAL',
    isInventory: false,
    inventoryName: null,
    picked: false,
    descriptionPickingManual: null,
    productUomId: 'units',
    packagingUomId: null,
    reservationDate: null,
    ...overrides.move,
  },
  lines: overrides.lines ?? [],
  product: {
    displayName: 'Bolt',
    defaultCode: 'B-1',
    uomId: 'units',
    descriptionPicking: null,
    descriptionPickingin: null,
    descriptionPickingout: null,
    templateDescription: null,
    ...overrides.product,
  },
  pickingType: overrides.pickingType === undefined ? null : overrides.pickingType,
  picking: overrides.picking === undefined ? { name: 'WH/OUT/00001', origin: null } : overrides.picking,
  scrapName: overrides.scrapName ?? null,
  originMoves: overrides.originMoves ?? [],
  sourceName: 'Stock',
  destinationName: 'Customers',
  uoms: UOMS,
  digits: 2,
});

const outgoing = { code: 'OUTGOING' as const, reservationMethod: 'AT_CONFIRM' as const, reservationDaysBefore: 0, reservationDaysBeforePriority: 0 };

describe('planMoveValues', () => {
  it('sums the lines in the move unit without rounding', () => {
    expect(planMoveValues(input({ lines: [{ quantity: 2, productUomId: 'units', picked: false }, { quantity: 1, productUomId: 'dozens', picked: false }] })).quantity).toBe(14);
    expect(planMoveValues(input({ move: { productUomId: 'dozens' } as MoveValuesInput['move'], lines: [{ quantity: 6, productUomId: 'units', picked: false }] })).quantity).toBe(0.5);
  });

  it('is picked when done or when any line is picked, not picked when lines exist and none is', () => {
    expect(planMoveValues(input({ move: { state: 'DONE' } as MoveValuesInput['move'] })).picked).toBe(true);
    expect(planMoveValues(input({ lines: [{ quantity: 1, productUomId: 'units', picked: true }, { quantity: 1, productUomId: 'units', picked: false }] })).picked).toBe(true);
    expect(planMoveValues(input({ move: { picked: true } as MoveValuesInput['move'], lines: [{ quantity: 1, productUomId: 'units', picked: false }] })).picked).toBe(false);
  });

  it('keeps the typed picked flag on a move with no lines', () => {
    expect(planMoveValues(input({ move: { picked: true } as MoveValuesInput['move'] })).picked).toBe(true);
  });

  it('gives the demand in the product unit, half up', () => {
    expect(planMoveValues(input({ move: { productUomId: 'dozens', productUomQty: 1 } as MoveValuesInput['move'] })).productQty).toBe(12);
    expect(planMoveValues(input({ product: { uomId: 'dozens' } as MoveValuesInput['product'], move: { productUomQty: 1 } as MoveValuesInput['move'] })).productQty).toBe(0.08);
  });

  it('reserves before the scheduled date by the type days, starred moves by the starred days', () => {
    const byDate = { code: 'OUTGOING' as const, reservationMethod: 'BY_DATE' as const, reservationDaysBefore: 3, reservationDaysBeforePriority: 5 };
    expect(planMoveValues(input({ pickingType: byDate })).reservationDate).toBe('2026-10-17');
    expect(planMoveValues(input({ pickingType: byDate, move: { priority: 'URGENT' } as MoveValuesInput['move'] })).reservationDate).toBe('2026-10-15');
  });

  it('leaves the reservation date of a reserved move, clears it for manual types, keeps it at confirmation', () => {
    const byDate = { code: 'OUTGOING' as const, reservationMethod: 'BY_DATE' as const, reservationDaysBefore: 3, reservationDaysBeforePriority: 5 };
    expect(planMoveValues(input({ pickingType: byDate, move: { state: 'ASSIGNED', reservationDate: '2026-10-01' } as MoveValuesInput['move'] })).reservationDate).toBe('2026-10-01');
    expect(planMoveValues(input({ pickingType: { ...byDate, reservationMethod: 'MANUAL' }, move: { reservationDate: '2026-10-01' } as MoveValuesInput['move'] })).reservationDate).toBeNull();
    expect(planMoveValues(input({ pickingType: outgoing, move: { reservationDate: '2026-10-08' } as MoveValuesInput['move'] })).reservationDate).toBe('2026-10-08');
  });

  it('alerts with the latest open original date when it is after the own date', () => {
    expect(planMoveValues(input({ originMoves: [{ state: 'ASSIGNED', date: '2026-10-22T08:00:00.000Z' }, { state: 'DONE', date: '2026-10-30T08:00:00.000Z' }] })).delayAlertDate).toBe('2026-10-22T08:00:00.000Z');
    expect(planMoveValues(input({ originMoves: [{ state: 'ASSIGNED', date: '2026-10-18T08:00:00.000Z' }] })).delayAlertDate).toBeNull();
    expect(planMoveValues(input({ move: { state: 'DONE' } as MoveValuesInput['move'], originMoves: [{ state: 'ASSIGNED', date: '2026-10-22T08:00:00.000Z' }] })).delayAlertDate).toBeNull();
  });

  it('takes the reference from the scrap, else the inventory name, else the transfer', () => {
    expect(planMoveValues(input({ scrapName: 'SP/00001' })).reference).toBe('SP/00001');
    expect(planMoveValues(input({ move: { isInventory: true, inventoryName: 'Physical Inventory' } as MoveValuesInput['move'] })).reference).toBe('Physical Inventory');
    expect(planMoveValues(input({ move: { isInventory: true } as MoveValuesInput['move'], picking: null })).reference).toBe('Product Quantity Confirmed');
    expect(planMoveValues(input({ move: { isInventory: true } as MoveValuesInput['move'], picking: null, lines: [{ quantity: 3, productUomId: 'units', picked: true }] })).reference).toBe('Product Quantity Updated');
    expect(planMoveValues(input()).reference).toBe('WH/OUT/00001');
    expect(planMoveValues(input({ picking: null })).reference).toBeNull();
  });

  it('names the move from the transfer origin, the product code and the two locations', () => {
    expect(planMoveValues(input({ picking: { name: 'WH/OUT/00001', origin: 'S00012' } })).name).toBe('S00012/B-1: Stock > Customers');
    expect(planMoveValues(input({ product: { defaultCode: null } as MoveValuesInput['product'] })).name).toBe('Stock > Customers');
  });

  it('describes the move: typed text, else the description for the operation, else the product', () => {
    const product = { descriptionPickingout: 'Handle with care', templateDescription: 'Steel bolt' } as MoveValuesInput['product'];
    expect(planMoveValues(input({ move: { descriptionPickingManual: 'Typed' } as MoveValuesInput['move'], pickingType: outgoing, product })).descriptionPicking).toBe('Typed');
    expect(planMoveValues(input({ pickingType: outgoing, product })).descriptionPicking).toBe('Handle with care');
    expect(planMoveValues(input({ pickingType: outgoing, product: { templateDescription: 'Steel bolt' } as MoveValuesInput['product'] })).descriptionPicking).toBe('Bolt');
    expect(planMoveValues(input({ pickingType: { ...outgoing, code: 'INCOMING' }, product: { templateDescription: 'Steel bolt' } as MoveValuesInput['product'] })).descriptionPicking).toBe('Steel bolt');
    expect(planMoveValues(input({ pickingType: { ...outgoing, code: 'INTERNAL' } })).descriptionPicking).toBe('Bolt');
  });

  it('gives the demand in the packaging unit, rounded up', () => {
    expect(planMoveValues(input({ move: { productUomQty: 24, packagingUomId: 'dozens' } as MoveValuesInput['move'] })).packagingUomQty).toBe(2);
    expect(planMoveValues(input({ move: { productUomQty: 25, packagingUomId: 'dozens' } as MoveValuesInput['move'] })).packagingUomQty).toBe(2.09);
    expect(planMoveValues(input()).packagingUomQty).toBeNull();
  });
});

describe('planLineValues', () => {
  it('converts the line to the product unit half up and names it', () => {
    expect(planLineValues({ quantity: 1, lineUomId: 'dozens', productUomId: 'units', reference: 'WH/OUT/00001', productName: 'Bolt', uoms: UOMS, digits: 2 })).toEqual({
      quantityProductUom: 12,
      name: 'WH/OUT/00001: Bolt',
    });
    expect(planLineValues({ quantity: 1, lineUomId: null, productUomId: 'units', reference: null, productName: 'Bolt', uoms: UOMS, digits: 2 }).name).toBe('Bolt');
  });
});
