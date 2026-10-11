import { describe, expect, it } from 'vitest';

import { ledgerDifferences, planLedgerFixes } from 'src/stock/utils/plan-ledger-fixes.util';
import { type LedgerDifference } from 'src/stock/utils/types/ledger-difference.type';

describe('ledgerDifferences', () => {
  it('lists keys whose stock row differs from the done lines, both ways, at the unit digits', () => {
    const differences = ledgerDifferences({
      digits: 2,
      totals: new Map([
        ['p|stock|||', 10],
        ['p|shelf|||', 4],
        ['p|vendors|||', -14],
        ['p|output|||', 3],
      ]),
      quants: [
        { id: 'q-stock', quantKey: 'p|stock|||', quantity: 10.001, reservedQuantity: 2, version: 7 },
        { id: 'q-shelf', quantKey: 'p|shelf|||', quantity: 5, reservedQuantity: 0, version: 3 },
        { id: 'q-vendors', quantKey: 'p|vendors|||', quantity: -14, reservedQuantity: 0, version: 1 },
        { id: 'q-old', quantKey: 'p|old|||', quantity: 2, reservedQuantity: 0, version: 9 },
      ],
    });

    expect(differences).toEqual([
      { key: 'p|shelf|||', quantId: 'q-shelf', version: 3, quantity: 5, reservedQuantity: 0, ledgerTotal: 4 },
      { key: 'p|output|||', quantId: null, version: null, quantity: 0, reservedQuantity: 0, ledgerTotal: 3 },
      { key: 'p|old|||', quantId: 'q-old', version: 9, quantity: 2, reservedQuantity: 0, ledgerTotal: 0 },
    ]);
  });
});

describe('planLedgerFixes', () => {
  const difference = (overrides: Partial<LedgerDifference> & { key: string }): LedgerDifference => ({
    quantId: `q-${overrides.key}`,
    version: 1,
    quantity: 5,
    reservedQuantity: 0,
    ledgerTotal: 4,
    ...overrides,
  });

  it('fixes a difference that is the same after the wait, with the same version', () => {
    const first = [difference({ key: 'a' })];
    expect(planLedgerFixes({ first, second: [difference({ key: 'a' })], digits: 2 })).toEqual([difference({ key: 'a' })]);
  });

  it('leaves a key whose posting landed meanwhile (difference gone)', () => {
    expect(planLedgerFixes({ first: [difference({ key: 'a' })], second: [], digits: 2 })).toEqual([]);
  });

  it('leaves a key whose row moved meanwhile (new version) or whose difference changed', () => {
    expect(
      planLedgerFixes({
        first: [difference({ key: 'a' }), difference({ key: 'b' })],
        second: [difference({ key: 'a', version: 2 }), difference({ key: 'b', quantity: 6, ledgerTotal: 4 })],
        digits: 2,
      }),
    ).toEqual([]);
  });

  it('fixes a missing row that is still missing', () => {
    const missing = difference({ key: 'c', quantId: null, version: null, quantity: 0, ledgerTotal: 3 });
    expect(planLedgerFixes({ first: [missing], second: [missing], digits: 2 })).toEqual([missing]);
  });
});
