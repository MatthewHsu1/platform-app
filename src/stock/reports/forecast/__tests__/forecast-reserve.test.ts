import { describe, expect, it } from 'vitest';

import { makeForecastReserve } from 'src/stock/reports/forecast/forecast-reserve';
import { type ChainMove } from 'src/stock/reports/forecast/types/chain-move.type';
import { StockUserError } from 'src/stock/stock-errors';

// A delivery fed by a pack, a pick and a done receipt, each in its own transfer.
const CHAIN: ChainMove[] = [
  { id: 'out', state: 'WAITING', pickingId: 'OUT', moveOrigIds: ['pack'] },
  { id: 'pack', state: 'ASSIGNED', pickingId: 'PACK', moveOrigIds: ['pick'] },
  { id: 'pick', state: 'CONFIRMED', pickingId: null, moveOrigIds: ['receipt'] },
  { id: 'receipt', state: 'DONE', pickingId: 'IN', moveOrigIds: [] },
];

const setup = ({ readable = true, chains = [CHAIN] }: { readable?: boolean; chains?: ChainMove[][] } = {}) => {
  const calls: { held: string[][]; assigned: string[][]; unreserved: string[][] } = { held: [], assigned: [], unreserved: [] };
  let reads = 0;
  const reserve = makeForecastReserve({
    canRead: async () => readable,
    readChain: async () => {
      const chain = chains[Math.min(reads, chains.length - 1)];

      reads += 1;
      return chain;
    },
    holdTransfers: async (recordIds, run) => {
      calls.held.push(recordIds);
      return run();
    },
    assignMoves: async (moveIds) => {
      calls.assigned.push(moveIds);
    },
    unreserveMoves: async (moveIds) => {
      calls.unreserved.push(moveIds);
    },
  });

  return { reserve, calls };
};

describe('forecast Reserve and Unreserve', () => {
  it('reserves the delivery and the waiting moves before it, holding each of their transfers', async () => {
    const { reserve, calls } = setup();

    expect(await reserve({ moveId: 'out', action: 'reserve' })).toEqual({ moveIds: ['out', 'pick'] });
    expect(calls.held).toEqual([['OUT', 'pick']]);
    expect(calls.assigned).toEqual([['out', 'pick']]);
  });

  it('unreserves every move of the chain that is not done', async () => {
    const { reserve, calls } = setup();

    expect(await reserve({ moveId: 'out', action: 'unreserve' })).toEqual({ moveIds: ['out', 'pack', 'pick'] });
    expect(calls.held).toEqual([['OUT', 'PACK', 'pick']]);
    expect(calls.unreserved).toEqual([['out', 'pack', 'pick']]);
  });

  it('leaves a move whose transfer was not held for the next click', async () => {
    const moved = CHAIN.map((move) => (move.id === 'pick' ? { ...move, pickingId: 'OTHER' } : move));
    const { reserve, calls } = setup({ chains: [CHAIN, moved] });

    expect(await reserve({ moveId: 'out', action: 'reserve' })).toEqual({ moveIds: ['out'] });
    expect(calls.assigned).toEqual([['out']]);
  });

  it('refuses a move the person cannot read', async () => {
    const { reserve, calls } = setup({ readable: false });

    await expect(reserve({ moveId: 'out', action: 'reserve' })).rejects.toBeInstanceOf(StockUserError);
    expect(calls.held).toEqual([]);
  });
});
