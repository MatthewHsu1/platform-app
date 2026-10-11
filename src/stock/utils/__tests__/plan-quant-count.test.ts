import { describe, expect, it } from 'vitest';

import { planCountTyped, planQuantKeyEdit, QUANT_KEY_EDIT_REASON } from 'src/stock/utils/plan-quant-count.util';

describe('planCountTyped', () => {
  it('sets the count flag and the difference, and clears the outdated flag', () => {
    expect(planCountTyped({ inventoryQuantity: 5, quantity: 7, digits: 2 })).toEqual({
      inventoryQuantitySet: true,
      inventoryDiffQuantity: -2,
      isOutdated: false,
    });
  });

  it('reads an emptied count as zero', () => {
    expect(planCountTyped({ inventoryQuantity: null, quantity: 7, digits: 2 })).toEqual({
      inventoryQuantitySet: true,
      inventoryDiffQuantity: -7,
      isOutdated: false,
    });
  });

  it('rounds the difference to the unit digits', () => {
    expect(planCountTyped({ inventoryQuantity: 0.3, quantity: 0.1, digits: 2 }).inventoryDiffQuantity).toBe(0.2);
  });
});

describe('planQuantKeyEdit', () => {
  const before = { productId: 'p', locationId: 'stock', lotId: null, packageId: null, ownerId: null };

  it('puts a changed key field back with a note', () => {
    expect(planQuantKeyEdit({ before, after: { ...before, locationId: 'shelf' }, beforeLocationUsage: 'INTERNAL' })).toEqual({
      data: { locationId: 'stock' },
      withNote: true,
      reason: QUANT_KEY_EDIT_REASON,
    });
  });

  it('puts it back silently on an inventory loss location', () => {
    expect(planQuantKeyEdit({ before, after: { ...before, ownerId: 'c1' }, beforeLocationUsage: 'INVENTORY' })).toEqual({
      data: { ownerId: null },
      withNote: false,
      reason: QUANT_KEY_EDIT_REASON,
    });
  });

  it('puts a changed lot back with a note', () => {
    expect(planQuantKeyEdit({ before, after: { ...before, lotId: 'lot1' }, beforeLocationUsage: 'INTERNAL' })).toEqual({
      data: { lotId: null },
      withNote: true,
      reason: QUANT_KEY_EDIT_REASON,
    });
  });

  it('puts a changed package back with a note', () => {
    expect(planQuantKeyEdit({ before, after: { ...before, packageId: 'box' }, beforeLocationUsage: 'INTERNAL' })).toEqual({
      data: { packageId: null },
      withNote: true,
      reason: QUANT_KEY_EDIT_REASON,
    });
  });

  it('does nothing when no key field changed', () => {
    expect(planQuantKeyEdit({ before, after: before, beforeLocationUsage: 'INTERNAL' })).toBeNull();
  });
});
