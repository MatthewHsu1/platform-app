import { describe, expect, it } from 'vitest';

import { makeReadLedgerGroups } from 'src/stock/scheduler/read-ledger-groups';
import { type LedgerDimension } from 'src/stock/scheduler/types/ledger-dimension.type';
import { type LedgerGroupQuery } from 'src/stock/scheduler/types/ledger-group-query.type';

type Row = Record<LedgerDimension, string | null> & { sum: number };

// Done-line sums per product, place, owner and lot, answered the way the group-by does: at most `limit` groups.
const fakeQuery = (rows: Row[]): LedgerGroupQuery => async ({ conditions, dimensions, limit }) => {
  const groups = new Map<string, { values: (string | null)[]; sum: number }>();

  const matches = (candidate: Row) =>
    conditions.every((condition) => {
      const value = candidate[condition.dimension];

      return condition.exclude === true ? value !== null && !condition.values.includes(value) : condition.values.includes(value);
    });

  for (const row of rows.filter(matches)) {
    const values = dimensions.map((dimension) => row[dimension]);
    const groupKey = JSON.stringify(values);
    const group = groups.get(groupKey) ?? { values, sum: 0 };
    group.sum += row.sum;
    groups.set(groupKey, group);
  }
  return [...groups.values()].slice(0, limit);
};

const row = (product: string, location: string, lot: string | null, sum = 1, pack: string | null = null): Row => ({
  product,
  location,
  owner: null,
  lot,
  package: pack,
  sum,
});

const lotIdsOf = (rows: Row[]) => async (productId: string) =>
  [...new Set(rows.flatMap((candidate) => (candidate.product === productId && candidate.lot !== null ? [candidate.lot] : [])))];

const noPackages = async () => [];

describe('readLedgerGroups', () => {
  it('reads every group of a product that has more stock places and lots than one answer holds', async () => {
    const rows = [
      ...['s1', 's2', 's3'].flatMap((location) => [row('serial', location, 'sn1'), row('serial', location, 'sn2')]),
      row('serial', 's1', null, 4),
      row('plain', 's1', null, 7),
    ];

    const groups = await makeReadLedgerGroups(fakeQuery(rows), 4, lotIdsOf(rows), noPackages)(['serial', 'plain'], 'in');

    expect(groups.map((group) => [...group.values, group.sum]).sort()).toEqual(
      rows.map((candidate) => [candidate.product, candidate.location, candidate.owner, candidate.lot, candidate.package, candidate.sum]).sort(),
    );
  });

  it('reads every serial number of a place that holds more of them than one answer', async () => {
    const rows = [...Array.from({ length: 1001 }, (_, index) => row('serial', 's1', `sn${index}`)), row('serial', 's1', null, 3)];

    const groups = await makeReadLedgerGroups(fakeQuery(rows), 1000, lotIdsOf(rows), noPackages)(['serial'], 'out');

    expect(groups).toHaveLength(1002);
    expect(groups.reduce((total, group) => total + group.sum, 0)).toBe(1004);
  });

  it('reads every package of one lot in one place when they are more than one answer holds', async () => {
    const rows = [...Array.from({ length: 6 }, (_, index) => row('boxed', 's1', 'lot1', index + 1, `pack${index}`)), row('boxed', 's1', 'lot1', 10)];

    const packageIds = async () => rows.flatMap((candidate) => candidate.package ?? []);
    const groups = await makeReadLedgerGroups(fakeQuery(rows), 4, lotIdsOf(rows), packageIds)(['boxed'], 'in');

    expect(groups.map((group) => [...group.values, group.sum]).sort()).toEqual(
      rows.map((candidate) => [candidate.product, candidate.location, candidate.owner, candidate.lot, candidate.package, candidate.sum]).sort(),
    );
  });

  it('reads the done lines whose lot belongs to another product', async () => {
    const rows = [
      ...Array.from({ length: 1001 }, (_, index) => row('serial', 's1', `sn${index}`)),
      row('serial', 's1', 'other-products-lot', 5),
    ];
    const ownLots = async () => rows.flatMap((candidate) => (candidate.lot === 'other-products-lot' || candidate.lot === null ? [] : [candidate.lot]));

    const groups = await makeReadLedgerGroups(fakeQuery(rows), 1000, ownLots, noPackages)(['serial'], 'in');

    expect(groups).toHaveLength(1002);
    expect(groups.find((group) => group.values[3] === 'other-products-lot')?.sum).toBe(5);
    expect(groups.reduce((total, group) => total + group.sum, 0)).toBe(1006);
  });
});
