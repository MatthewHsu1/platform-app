import { describe, expect, it } from 'vitest';

import { planInDate, planQuantDeltaWrite, planQuantWrite } from 'src/stock/utils/plan-quant-delta.util';

const NOW = '2026-10-08T12:00:00.000Z';
const OLD = '2026-10-01T08:00:00.000Z';
const NEWER = '2026-10-05T08:00:00.000Z';

describe('planInDate', () => {
  it('keeps the oldest of the stock already there and the incoming date', () => {
    expect(planInDate({ existing: { quantity: 3, inDate: OLD }, incomingInDate: NEWER, bypassesReservation: false, now: NOW, digits: 2 })).toBe(OLD);
    expect(planInDate({ existing: { quantity: 3, inDate: NEWER }, incomingInDate: OLD, bypassesReservation: false, now: NOW, digits: 2 })).toBe(OLD);
  });

  it('ignores the date of empty or negative stock', () => {
    expect(planInDate({ existing: { quantity: 0, inDate: OLD }, incomingInDate: NEWER, bypassesReservation: false, now: NOW, digits: 2 })).toBe(NEWER);
    expect(planInDate({ existing: { quantity: -2, inDate: OLD }, incomingInDate: null, bypassesReservation: false, now: NOW, digits: 2 })).toBe(NOW);
  });

  it('ignores old dates on a vendor or customer location', () => {
    expect(planInDate({ existing: { quantity: 3, inDate: OLD }, incomingInDate: null, bypassesReservation: true, now: NOW, digits: 2 })).toBe(NOW);
  });

  it('gives a removal the date of the stock it takes, for the destination to keep', () => {
    expect(planInDate({ existing: { quantity: 1, inDate: OLD }, incomingInDate: null, bypassesReservation: false, now: NOW, digits: 2 })).toBe(OLD);
  });
});

const quant = (overrides = {}) => ({
  id: 'q',
  quantKey: 'p|stock|||',
  quantity: 7,
  reservedQuantity: 2,
  inDate: OLD,
  version: 4,
  inventoryQuantitySet: false,
  inventoryQuantity: null,
  inventoryDiffQuantity: null,
  ...overrides,
});

describe('planQuantDeltaWrite', () => {
  it('adds the delta, keeps available in step and moves the version on', () => {
    expect(planQuantDeltaWrite({ quant: quant(), delta: -3, incomingInDate: null, bypassesReservation: false, now: NOW, digits: 2 })).toEqual({
      data: { quantity: 4, availableQuantity: 2, inDate: OLD, version: 5 },
      quantity: 4,
      inDate: OLD,
    });
  });

  it('marks a set count outdated when the stock moved under it', () => {
    const counted = quant({ inventoryQuantitySet: true, inventoryQuantity: 5, inventoryDiffQuantity: -2, reservedQuantity: 0 });
    expect(planQuantDeltaWrite({ quant: counted, delta: -3, incomingInDate: null, bypassesReservation: false, now: NOW, digits: 2 }).data).toEqual({
      quantity: 4,
      availableQuantity: 4,
      inDate: OLD,
      version: 5,
      isOutdated: true,
    });
  });

  it('makes nothing available once the lot of a product with expiry reaches its removal date', () => {
    const expired = quant({ removalDate: '2026-10-08T11:00:00.000Z', useExpirationDate: true });
    const fresh = quant({ removalDate: '2026-10-08T13:00:00.000Z', useExpirationDate: true });

    expect(planQuantDeltaWrite({ quant: expired, delta: 3, incomingInDate: null, bypassesReservation: false, now: NOW, digits: 2 }).data).toMatchObject({
      quantity: 10,
      availableQuantity: 0,
    });
    expect(planQuantDeltaWrite({ quant: fresh, delta: 3, incomingInDate: null, bypassesReservation: false, now: NOW, digits: 2 }).data).toMatchObject({
      quantity: 10,
      availableQuantity: 8,
    });
  });

  it('allows stock to go negative and rounds to the unit precision', () => {
    expect(planQuantDeltaWrite({ quant: quant({ quantity: 0.1, reservedQuantity: 0 }), delta: -0.30000000000000004, incomingInDate: null, bypassesReservation: false, now: NOW, digits: 2 }).quantity).toBe(-0.2);
  });
});

describe('planQuantWrite', () => {
  it('writes reserved with available and the next version', () => {
    expect(planQuantWrite({ quant: quant(), reservedQuantity: 7, digits: 2, now: NOW })).toEqual({ reservedQuantity: 7, availableQuantity: 0, version: 5 });
  });

  it('writes nothing available for an expired lot when reserved changes', () => {
    const expired = quant({ removalDate: '2026-10-01T00:00:00.000Z', useExpirationDate: true });

    expect(planQuantWrite({ quant: expired, reservedQuantity: 1, digits: 2, now: NOW })).toEqual({ reservedQuantity: 1, availableQuantity: 0, version: 5 });
  });
});
