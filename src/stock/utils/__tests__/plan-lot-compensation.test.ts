import { describe, expect, it } from 'vitest';

import { planLotCompensation } from 'src/stock/utils/plan-lot-compensation.util';

describe('planLotCompensation', () => {
  it('turns the untracked unit into the lot a done line took below zero', () => {
    expect(planLotCompensation({ key: 'p|stock|lot1||', lotAvailable: -1, noLotFree: 1, quantity: 1, digits: 2 })).toEqual({
      noLotKey: 'p|stock|||',
      quantity: 1,
    });
  });

  it('takes no more than the stock without a lot has free', () => {
    expect(planLotCompensation({ key: 'p|stock|lot1|box|o', lotAvailable: -3, noLotFree: 1, quantity: 3, digits: 2 })).toEqual({
      noLotKey: 'p|stock||box|o',
      quantity: 1,
    });
  });

  it('takes no more than the line moved', () => {
    expect(planLotCompensation({ key: 'p|stock|lot1||', lotAvailable: -1, noLotFree: 5, quantity: -2, digits: 2 })?.quantity).toBe(2);
  });

  it('plans nothing when the lot stays at or above zero, the line has no lot, or nothing is free without a lot', () => {
    expect(planLotCompensation({ key: 'p|stock|lot1||', lotAvailable: 0, noLotFree: 1, quantity: 1, digits: 2 })).toBeNull();
    expect(planLotCompensation({ key: 'p|stock|||', lotAvailable: -1, noLotFree: 1, quantity: 1, digits: 2 })).toBeNull();
    expect(planLotCompensation({ key: 'p|stock|lot1||', lotAvailable: -1, noLotFree: -2, quantity: 1, digits: 2 })).toBeNull();
  });
});
