import { type ObjectRecordEvent } from 'twenty-sdk/define';
import { describe, expect, it } from 'vitest';

import { CLAIM_HELD_MESSAGE } from 'src/shared/claims/claim';
import {
  LOT_RUN_QUANTS,
  LOT_SAVE_LIMIT_MS,
  TOO_MANY_LOTS_MESSAGE,
  makeRelocateLotEdits,
} from 'src/stock/lot/relocate-lot-edits';
import { VIEW_LOCATION_REASON } from 'src/stock/utils/plan-count-quant-create.util';
import { type LotBatchOutcome } from 'src/stock/lot/types/lot-batch-outcome.type';
import { type LotEventRecord } from 'src/stock/lot/types/lot-event-record.type';

const lot = (id: string, locationId: string | null, source = 'MANUAL'): LotEventRecord => ({
  id,
  name: id,
  productId: 'p',
  locationId,
  expirationDate: null,
  useDate: null,
  removalDate: null,
  alertDate: null,
  updatedBy: { source },
});

const updated = (before: LotEventRecord, after: LotEventRecord) =>
  ({ recordId: after.id, properties: { before, after } }) as unknown as ObjectRecordEvent<LotEventRecord>;

const moved = (id: string, from: string | null, to: string | null) => updated(lot(id, from), lot(id, to));

// Every run's lots answer `outcomeOf(lotId)`; a run takes `runMs` on the clock.
const setup = ({
  outcomeOf = () => ({ kind: 'done' }),
  quantCounts = {},
  runMs = 0,
}: {
  outcomeOf?: (lotId: string) => LotBatchOutcome;
  quantCounts?: Record<string, number>;
  runMs?: number;
} = {}) => {
  const calls: unknown[] = [];
  let clock = 0;
  const relocateEdits = makeRelocateLotEdits({
    readLotQuantCounts: async (lotIds) => new Map(lotIds.map((lotId) => [lotId, quantCounts[lotId] ?? 1])),
    relocateLotBatch: async (requests) => {
      calls.push({ batch: requests.map((request) => `${request.lotId}>${request.toLocationId}`) });
      clock += runMs;
      return new Map(requests.map((request) => [request.lotId, outcomeOf(request.lotId)]));
    },
    relocateLot: async (lotId, toLocationId) => {
      calls.push({ alone: lotId, to: toLocationId });
      return { kind: 'done' };
    },
    putBackLocation: async (event, locationId, message) => {
      calls.push({ putBack: event.recordId, locationId, message });
    },
    recomputeLot: async (lotIds) => {
      calls.push({ recompute: lotIds });
    },
    addNotes: async (events, message) => {
      calls.push(...events.map((event) => ({ note: event.recordId, message })));
    },
    now: () => clock,
  });

  return { calls, relocateEdits };
};

// The stockLot trigger stops after 120 s. Live, a run of 25 stock rows took 20–23 s and each lot not moved cost up
// to 0.4 s to put back with its note.
const TRIGGER_LIMIT_MS = 120_000;
const LIVE_PUT_BACK_MS_PER_LOT = 400;
// A later run starts only while the save can still end by 90 s, so 30 s are left for a run slower than the others.
const LATER_RUN_END_MS = 90_000;

const timedSave = (runMs: number, rowsPerLot: number) => {
  let clock = 0;
  const moved = new Set<string>();
  const recomputed = new Set<string>();
  const noted = new Map<string, string>();
  const relocateEdits = makeRelocateLotEdits({
    readLotQuantCounts: async (lotIds) => new Map(lotIds.map((lotId) => [lotId, rowsPerLot])),
    relocateLotBatch: async (requests) => {
      clock += runMs;
      requests.forEach((request) => moved.add(request.lotId));
      return new Map(requests.map((request) => [request.lotId, { kind: 'done' }]));
    },
    relocateLot: async () => ({ kind: 'done' }),
    putBackLocation: async () => {},
    recomputeLot: async (lotIds) => {
      lotIds.forEach((lotId) => recomputed.add(lotId));
    },
    addNotes: async (events, message) => {
      for (const event of events) {
        clock += LIVE_PUT_BACK_MS_PER_LOT;
        noted.set(event.recordId, message);
      }
    },
    now: () => clock,
  });

  return { relocateEdits, moved, recomputed, noted, end: () => clock };
};

describe('relocateLotEdits', () => {
  it('moves the lots of one save together and puts back the location of a refused one with its note', async () => {
    const { calls, relocateEdits } = setup({
      outcomeOf: (lotId) => (lotId === 'b' ? { kind: 'refused', reason: VIEW_LOCATION_REASON, values: { location: 'WH' } } : { kind: 'done' }),
    });

    await relocateEdits([moved('a', 'A', 'shelf'), moved('b', 'A', 'WH'), moved('c', 'B', 'shelf')]);

    expect(calls).toEqual([
      { batch: ['a>shelf', 'b>WH', 'c>shelf'] },
      { putBack: 'b', locationId: 'A', message: VIEW_LOCATION_REASON },
    ]);
  });

  it('while another run moves a lot, its location comes from its stock and a note says why', async () => {
    const { calls, relocateEdits } = setup({ outcomeOf: () => ({ kind: 'held' }) });

    await relocateEdits([moved('a', 'A', 'B')]);

    expect(calls).toEqual([{ batch: ['a>B'] }, { recompute: ['a'] }, { note: 'a', message: CLAIM_HELD_MESSAGE }]);
  });

  it('moves a lot whose last run stopped on its own, so that run is finished first', async () => {
    const { calls, relocateEdits } = setup({ outcomeOf: (lotId) => (lotId === 'a' ? { kind: 'stale' } : { kind: 'done' }) });

    await relocateEdits([moved('a', 'A', 'B'), moved('b', 'A', 'B')]);

    expect(calls).toEqual([{ batch: ['a>B', 'b>B'] }, { alone: 'a', to: 'B' }]);
  });

  it('moves only on a staff change of the location', async () => {
    const { calls, relocateEdits } = setup();

    await relocateEdits([
      updated(lot('a', 'A'), lot('a', 'B', 'APPLICATION')),
      updated(lot('a', 'A'), lot('a', 'A')),
      moved('a', 'A', null),
    ]);

    expect(calls).toEqual([{ batch: ['a>null'] }]);
  });

  it('when the save holds more lots than fit in the time, the lots not taken show where their stock is with a note', async () => {
    const lotIds = Array.from({ length: LOT_RUN_QUANTS + 5 }, (_, index) => `lot${index}`);
    const { calls, relocateEdits } = setup({ runMs: LOT_SAVE_LIMIT_MS / 2 + 1 });

    await relocateEdits(lotIds.map((lotId) => moved(lotId, 'A', 'shelf')));

    const notTaken = lotIds.slice(LOT_RUN_QUANTS);
    expect(calls).toEqual([
      { batch: lotIds.slice(0, LOT_RUN_QUANTS).map((lotId) => `${lotId}>shelf`) },
      { recompute: notTaken },
      ...notTaken.map((lotId) => ({ note: lotId, message: TOO_MANY_LOTS_MESSAGE })),
    ]);
  });

  it('a lot without stock that is left over or held keeps the location typed on it, with no note', async () => {
    const lotIds = Array.from({ length: LOT_RUN_QUANTS }, (_, index) => `lot${index}`);
    const late = setup({ runMs: LOT_SAVE_LIMIT_MS, quantCounts: { emptyLate: 0 } });

    await late.relocateEdits([...lotIds, 'emptyLate', 'late'].map((lotId) => moved(lotId, 'A', 'shelf')));

    const held = setup({ outcomeOf: () => ({ kind: 'held' }), quantCounts: { empty: 0 } });

    await held.relocateEdits([moved('empty', 'A', 'B'), moved('stocked', 'A', 'B')]);

    expect({ late: late.calls.slice(1), held: held.calls.slice(1) }).toEqual({
      late: [{ recompute: ['late'] }, { note: 'late', message: TOO_MANY_LOTS_MESSAGE }],
      held: [{ recompute: ['stocked'] }, { note: 'stocked', message: CLAIM_HELD_MESSAGE }],
    });
  });

  it('takes the next lots while the time allows', async () => {
    const lotIds = Array.from({ length: LOT_RUN_QUANTS + 5 }, (_, index) => `lot${index}`);
    const { calls, relocateEdits } = setup({ runMs: LOT_SAVE_LIMIT_MS / 2 - 1 });

    await relocateEdits(lotIds.map((lotId) => moved(lotId, 'A', 'shelf')));

    expect(calls).toEqual([
      { batch: lotIds.slice(0, LOT_RUN_QUANTS).map((lotId) => `${lotId}>shelf`) },
      { batch: lotIds.slice(LOT_RUN_QUANTS).map((lotId) => `${lotId}>shelf`) },
    ]);
  });

  it.each([20_000, 21_000, 22_000, 23_000].flatMap((runMs) => [1, LOT_RUN_QUANTS].map((rowsPerLot) => ({ runMs, rowsPerLot }))))(
    'a save of 200 lots ends by 90 s or after its first run, inside the trigger time, and puts back every lot not moved with its note (run $runMs ms, $rowsPerLot rows a lot)',
    async ({ runMs, rowsPerLot }) => {
      const lotIds = Array.from({ length: 200 }, (_, index) => `lot${index}`);
      const save = timedSave(runMs, rowsPerLot);

      await save.relocateEdits(lotIds.map((lotId) => moved(lotId, 'A', 'shelf')));

      const notMoved = lotIds.filter((lotId) => !save.moved.has(lotId));
      // The first run always starts; when it is the only one, the save ends with the put-back of every lot after it.
      const firstRunOnlyEnd = runMs + (lotIds.length - Math.floor(LOT_RUN_QUANTS / rowsPerLot)) * LIVE_PUT_BACK_MS_PER_LOT;
      expect({
        endsInTime: save.end() < TRIGGER_LIMIT_MS,
        endsByPlan: save.end() <= Math.max(LATER_RUN_END_MS, firstRunOnlyEnd),
        recomputed: [...save.recomputed],
        noted: [...save.noted],
      }).toEqual({
        endsInTime: true,
        endsByPlan: true,
        recomputed: notMoved,
        noted: notMoved.map((lotId) => [lotId, TOO_MANY_LOTS_MESSAGE]),
      });
    },
  );
});
