import { describe, expect, it } from 'vitest';

import {
  isOutdatedCount,
  planClearCounts,
  planConflictAnswer,
  planQuantityUpdates,
  planRequestCount,
  planSetCounts,
  planSetCountsToZero,
} from 'src/stock/utils/plan-count-actions.util';
import { type CountQuant } from 'src/stock/utils/types/count-quant.type';

const quant = (overrides: Partial<CountQuant>): CountQuant => ({
  id: 'quant',
  quantity: 0,
  inventoryQuantity: null,
  inventoryDiffQuantity: null,
  inventoryQuantitySet: false,
  ...overrides,
});

describe('isOutdatedCount', () => {
  it('is true when the stock moved after the count was typed (counted 5 at 7, now 4)', () => {
    expect(
      isOutdatedCount(quant({ quantity: 4, inventoryQuantity: 5, inventoryDiffQuantity: -2, inventoryQuantitySet: true }), 2),
    ).toBe(true);
  });

  it('is false while the stock is what the count was typed against, or when no count is set', () => {
    expect(
      isOutdatedCount(quant({ quantity: 7, inventoryQuantity: 5, inventoryDiffQuantity: -2, inventoryQuantitySet: true }), 2),
    ).toBe(false);
    expect(isOutdatedCount(quant({ quantity: 4, inventoryQuantity: 5, inventoryDiffQuantity: -2 }), 2)).toBe(false);
  });
});

describe('planSetCounts', () => {
  it('copies the stock into the count and assigns the clicking user', () => {
    expect(planSetCounts({ quants: [quant({ id: 'a', quantity: 7 })], memberId: 'me', onlyUnset: false })).toEqual({
      kind: 'write',
      updates: [
        {
          id: 'a',
          data: { inventoryQuantity: 7, inventoryDiffQuantity: 0, inventoryQuantitySet: true, isOutdated: false, assignedUserId: 'me' },
        },
      ],
    });
  });

  it('asks first when some rows already have a count', () => {
    expect(
      planSetCounts({
        quants: [quant({ id: 'a' }), quant({ id: 'b', inventoryQuantitySet: true })],
        memberId: 'me',
        onlyUnset: false,
      }),
    ).toEqual({ kind: 'needsAnswer', alreadySetIds: ['b'] });
  });

  it('sets only the rows without a count after the answer "Set"', () => {
    const plan = planSetCounts({
      quants: [quant({ id: 'a', quantity: 2 }), quant({ id: 'b', inventoryQuantitySet: true })],
      memberId: 'me',
      onlyUnset: true,
    });

    expect(plan.kind === 'write' && plan.updates.map((update) => update.id)).toEqual(['a']);
  });
});

describe('the other count buttons', () => {
  it('Clear empties the count and the assigned user', () => {
    expect(planClearCounts(['a'])).toEqual([
      {
        id: 'a',
        data: { inventoryQuantity: 0, inventoryDiffQuantity: 0, inventoryQuantitySet: false, isOutdated: false, assignedUserId: null },
      },
    ]);
  });

  it('Set to 0 counts 0 against 100 on hand', () => {
    expect(planSetCountsToZero({ quants: [quant({ id: 'a', quantity: 100 })], memberId: 'me' })).toEqual([
      {
        id: 'a',
        data: { inventoryQuantity: 0, inventoryDiffQuantity: -100, inventoryQuantitySet: true, isOutdated: false, assignedUserId: 'me' },
      },
    ]);
  });

  it("Keep counted quantity recomputes the difference from today's stock: counted 5, on hand 4 → +1", () => {
    expect(
      planConflictAnswer({
        quants: [quant({ id: 'a', quantity: 4, inventoryQuantity: 5, inventoryDiffQuantity: -2, inventoryQuantitySet: true })],
        answer: 'keepCounted',
      }),
    ).toEqual([{ id: 'a', data: { inventoryDiffQuantity: 1, isOutdated: false } }]);
  });

  it('Keep difference moves the count: on hand 4, difference -2 → counted 2', () => {
    expect(
      planConflictAnswer({
        quants: [quant({ id: 'a', quantity: 4, inventoryQuantity: 5, inventoryDiffQuantity: -2, inventoryQuantitySet: true })],
        answer: 'keepDifference',
      }),
    ).toEqual([{ id: 'a', data: { inventoryQuantity: 2, isOutdated: false } }]);
  });

  it('Request a Count writes the date, and the user only when one is picked', () => {
    expect(planRequestCount({ quantIds: ['a'], inventoryDate: '2026-10-20', assignedUserId: null })).toEqual([
      { id: 'a', data: { inventoryDate: '2026-10-20' } },
    ]);
    expect(planRequestCount({ quantIds: ['a'], inventoryDate: '2026-10-20', assignedUserId: 'm' })).toEqual([
      { id: 'a', data: { inventoryDate: '2026-10-20', assignedUserId: 'm' } },
    ]);
  });

  it('Update quantity applies only the rows whose count differs from the stock', () => {
    expect(
      planQuantityUpdates(
        [
          { key: 'same', onHand: 5, counted: 5 },
          { key: 'new', onHand: 0, counted: 3 },
        ],
        2,
      ).map((row) => row.key),
    ).toEqual(['new']);
  });
});
