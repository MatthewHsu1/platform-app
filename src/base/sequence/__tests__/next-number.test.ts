import { describe, expect, it } from 'vitest';

import { formatSequenceNumber, makeSequenceNumbers } from 'src/base/sequence/next-number';
import { type SequenceStore } from 'src/base/sequence/types/sequence-store.type';

describe('formatSequenceNumber', () => {
  it('pads the number to the sequence size after the prefix', () => {
    expect(formatSequenceNumber('WH/IN/', 5, 1)).toBe('WH/IN/00001');
    expect(formatSequenceNumber('SP/', 5, 42)).toBe('SP/00042');
  });

  it('keeps a number longer than the size and allows no padding', () => {
    expect(formatSequenceNumber('WH/OUT/', 5, 123456)).toBe('WH/OUT/123456');
    expect(formatSequenceNumber('', 0, 7)).toBe('7');
  });
});

type Row = { prefix: string | null; padding: number; numberNext: number; numberIncrement: number };

const fakeStore = (row: Row, clashes = 0) => {
  let remainingClashes = clashes;
  const waits: number[] = [];
  const store: SequenceStore = {
    read: async () => ({ ...row }),
    advance: async (_id, from, to) => {
      if (remainingClashes > 0) {
        remainingClashes -= 1;
        row.numberNext += row.numberIncrement;
        return false;
      }
      if (row.numberNext !== from) {
        return false;
      }
      row.numberNext = to;
      return true;
    },
    findActiveIdByCode: async (code) => (code === 'stock.scrap' ? 'scrap-sequence' : null),
    wait: async (ms) => {
      waits.push(ms);
    },
  };

  return { store, row, waits };
};

describe('nextNumber', () => {
  it('returns the next number and moves the counter by the step', async () => {
    const { store, row } = fakeStore({ prefix: 'WH/IN/', padding: 5, numberNext: 1, numberIncrement: 1 });
    const { nextNumber } = makeSequenceNumbers(store);

    expect(await nextNumber('in')).toBe('WH/IN/00001');
    expect(await nextNumber('in')).toBe('WH/IN/00002');
    expect(row.numberNext).toBe(3);
  });

  it('reads again after another run took the number, so two runs never share one', async () => {
    const { store, row } = fakeStore({ prefix: 'WH/OUT/', padding: 5, numberNext: 7, numberIncrement: 1 }, 2);
    const { nextNumber } = makeSequenceNumbers(store);

    expect(await nextNumber('out')).toBe('WH/OUT/00009');
    expect(row.numberNext).toBe(10);
  });

  it('stops after ten clashes in a row', async () => {
    const { store } = fakeStore({ prefix: 'X/', padding: 1, numberNext: 1, numberIncrement: 1 }, 10);
    const { nextNumber } = makeSequenceNumbers(store);

    await expect(nextNumber('x')).rejects.toThrow('Could not take a number from sequence x after 10 tries.');
  });

  it('waits longer after each clash', async () => {
    const { store, waits } = fakeStore({ prefix: 'X/', padding: 1, numberNext: 1, numberIncrement: 1 }, 9);
    const { nextNumber } = makeSequenceNumbers(store);

    await nextNumber('x');

    expect(waits).toHaveLength(9);
    expect(Math.max(...waits.slice(-3))).toBeGreaterThan(Math.max(...waits.slice(0, 3)));
  });

  it('takes the first active sequence with the code, or none', async () => {
    const { store } = fakeStore({ prefix: 'SP/', padding: 5, numberNext: 3, numberIncrement: 1 });
    const { nextNumberByCode } = makeSequenceNumbers(store);

    expect(await nextNumberByCode('stock.scrap')).toBe('SP/00003');
    expect(await nextNumberByCode('stock.lot.serial')).toBeNull();
  });
});
