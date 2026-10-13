import { describe, expect, it } from 'vitest';

import { planProductQuantities } from 'src/stock/utils/plan-product-quantities.util';

const STOCK = 'stock';
const SHELF = 'shelf';
const ARCHIVED_SHELF = 'archived-shelf';
const OUTPUT = 'output';
const CUSTOMERS = 'customers';
const VENDORS = 'vendors';
const TRANSIT = 'transit';
const SCOPE = new Set([STOCK, SHELF, ARCHIVED_SHELF, OUTPUT]);
const NOW = new Date('2026-10-10T12:00:00.000Z');

const product = (id: string, templateId = 'tmpl', productType = 'CONSU') => ({ id, templateId, productType });
const quant = (locationId: string, quantity: number, reservedQuantity = 0, productId = 'p') => ({
  productId,
  locationId,
  quantity,
  reservedQuantity,
});
const move = (
  state: 'DRAFT' | 'WAITING' | 'CONFIRMED' | 'PARTIALLY_AVAILABLE' | 'ASSIGNED' | 'DONE' | 'CANCEL',
  productQty: number,
  locationId: string,
  locationDestId: string,
  locationFinalId: string | null = null,
  productId = 'p',
) => ({ productId, state, productQty, locationId, locationDestId, locationFinalId });

const plan = (input: Partial<Parameters<typeof planProductQuantities>[0]>) =>
  planProductQuantities({
    products: [product('p')],
    scopeLocationIds: SCOPE,
    quants: [],
    moves: [],
    digits: 2,
    now: NOW,
    ...input,
  });

describe('planProductQuantities', () => {
  const stock40 = [quant(STOCK, 30), quant(STOCK, 10)];

  it('counts on hand and ignores draft deliveries (40 on hand, 40 forecast)', () => {
    const result = plan({ quants: stock40, moves: [move('DRAFT', 3, STOCK, CUSTOMERS), move('DRAFT', 5, STOCK, CUSTOMERS)] });
    expect(result.products.get('p')).toEqual({
      qtyAvailable: 40,
      freeQty: 40,
      incomingQty: 0,
      outgoingQty: 0,
      virtualAvailable: 40,
    });
  });

  it('confirmed deliveries lower the forecast, not the free quantity (40 free, 32 forecast)', () => {
    const result = plan({
      quants: stock40,
      moves: [move('CONFIRMED', 3, STOCK, CUSTOMERS), move('CONFIRMED', 5, STOCK, CUSTOMERS)],
    });
    expect(result.products.get('p')).toMatchObject({ freeQty: 40, outgoingQty: 8, virtualAvailable: 32 });
  });

  it('reserved deliveries lower the free quantity too (32 free, 32 forecast)', () => {
    const result = plan({
      quants: [quant(STOCK, 30, 3), quant(STOCK, 10, 5)],
      moves: [move('ASSIGNED', 3, STOCK, CUSTOMERS), move('ASSIGNED', 5, STOCK, CUSTOMERS)],
    });
    expect(result.products.get('p')).toMatchObject({ qtyAvailable: 40, freeQty: 32, virtualAvailable: 32 });
  });

  it('a partly reserved delivery of 5 from 3 on hand gives a forecast of -2', () => {
    const result = plan({ quants: [quant(STOCK, 3, 3)], moves: [move('PARTIALLY_AVAILABLE', 5, STOCK, CUSTOMERS)] });
    expect(result.products.get('p')).toMatchObject({ qtyAvailable: 3, freeQty: 0, virtualAvailable: -2 });
  });

  it('counts a receipt from vendors into stock as incoming', () => {
    const result = plan({ moves: [move('ASSIGNED', 10, VENDORS, STOCK)] });
    expect(result.products.get('p')).toMatchObject({ incomingQty: 10, outgoingQty: 0, virtualAvailable: 10 });
  });

  it('uses the final location when set: stock to output bound for customers is outgoing', () => {
    const result = plan({ quants: [quant(STOCK, 4)], moves: [move('CONFIRMED', 4, STOCK, OUTPUT, CUSTOMERS)] });
    expect(result.products.get('p')).toMatchObject({ outgoingQty: 4, virtualAvailable: 0 });
  });

  it('a move inside the warehouses is neither incoming nor outgoing', () => {
    const result = plan({ quants: [quant(STOCK, 4)], moves: [move('ASSIGNED', 4, STOCK, SHELF)] });
    expect(result.products.get('p')).toMatchObject({ incomingQty: 0, outgoingQty: 0, virtualAvailable: 4 });
  });

  it('stock sent to a transit location outside every warehouse is outgoing', () => {
    const result = plan({ quants: [quant(STOCK, 4)], moves: [move('ASSIGNED', 4, STOCK, TRANSIT)] });
    expect(result.products.get('p')).toMatchObject({ outgoingQty: 4 });
  });

  it('counts archived locations under a warehouse and leaves out stock outside every warehouse', () => {
    const result = plan({ quants: [quant(ARCHIVED_SHELF, 2), quant(TRANSIT, 7), quant(CUSTOMERS, 9)] });
    expect(result.products.get('p')?.qtyAvailable).toBe(2);
  });

  it('ignores done and cancelled moves', () => {
    const result = plan({ moves: [move('DONE', 4, VENDORS, STOCK), move('CANCEL', 4, STOCK, CUSTOMERS)] });
    expect(result.products.get('p')).toMatchObject({ incomingQty: 0, outgoingQty: 0 });
  });

  it('gives a service all zeros', () => {
    const result = plan({
      products: [product('p', 'tmpl', 'SERVICE')],
      quants: [quant(STOCK, 5)],
      moves: [move('CONFIRMED', 1, STOCK, CUSTOMERS)],
    });
    expect(result.products.get('p')).toEqual({
      qtyAvailable: 0,
      freeQty: 0,
      incomingQty: 0,
      outgoingQty: 0,
      virtualAvailable: 0,
    });
  });

  it('rounds each value to the unit digits', () => {
    const result = plan({ quants: [quant(STOCK, 0.1), quant(SHELF, 0.2)] });
    expect(result.products.get('p')?.qtyAvailable).toBe(0.3);
  });

  it('sums the variants into their product, archived variants included', () => {
    const result = plan({
      products: [product('red'), product('blue')],
      quants: [quant(STOCK, 2, 0, 'red'), quant(STOCK, 3, 1, 'blue')],
      moves: [move('CONFIRMED', 1, STOCK, CUSTOMERS, null, 'blue')],
    });
    expect(result.templates.get('tmpl')).toEqual({
      qtyAvailable: 5,
      incomingQty: 0,
      outgoingQty: 1,
      virtualAvailable: 4,
    });
  });

  it('keeps stock whose removal date is still ahead in the forecast', () => {
    const result = plan({ quants: [{ ...quant(STOCK, 10), removalDate: '2027-10-10T00:00:00.000Z' }] });
    expect(result.products.get('p')).toMatchObject({ qtyAvailable: 10, freeQty: 10, virtualAvailable: 10 });
  });

  it('takes expired unreserved stock out of free and forecast, for the product too, but not out of on hand', () => {
    const result = plan({
      quants: [
        { ...quant(STOCK, 10, 2), removalDate: '2026-10-09T00:00:00.000Z' },
        { ...quant(STOCK, 5), removalDate: '2026-10-20T00:00:00.000Z' },
        { ...quant(CUSTOMERS, 7), removalDate: '2026-10-01T00:00:00.000Z' },
      ],
      moves: [move('ASSIGNED', 2, STOCK, CUSTOMERS)],
    });
    expect(result.products.get('p')).toEqual({
      qtyAvailable: 15,
      freeQty: 5,
      incomingQty: 0,
      outgoingQty: 2,
      virtualAvailable: 5,
    });
    expect(result.templates.get('tmpl')).toMatchObject({ qtyAvailable: 15, virtualAvailable: 5 });
  });
});
