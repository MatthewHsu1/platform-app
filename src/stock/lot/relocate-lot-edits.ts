import { type ObjectRecordEvent } from 'twenty-sdk/define';

import { CLAIM_HELD_MESSAGE } from 'src/shared/claims/claim';
import { isStaffChange } from 'src/shared/triggers/actor';
import { addNotes } from 'src/shared/triggers/put-back';
import { countBy } from 'src/shared/utils/count-by.util';
import { errorCollector } from 'src/shared/triggers/retry-on-conflict';
import { recomputeLot } from 'src/stock/lot/recompute-lot';
import { relocateLot } from 'src/stock/lot/relocate-lot';
import { relocateLotBatch } from 'src/stock/lot/relocate-lot-batch';
import { eventAfter, eventBefore, localizedReason } from 'src/stock/stock-event-helpers';
import { putBackForEvent } from 'src/stock/stock-put-back';
import { stockQuants } from 'src/stock/stock-records';
import { planLotRelocationRuns } from 'src/stock/utils/plan-lot-relocation-batch.util';
import { type TranslationValues } from 'src/shared/i18n/types/translation-values.type';
import { type LotBatchOutcome } from 'src/stock/lot/types/lot-batch-outcome.type';
import { type LotEventRecord } from 'src/stock/lot/types/lot-event-record.type';
import { type LotRelocationRequest } from 'src/stock/lot/types/lot-relocation-request.type';
import { type RelocateLotOutcome } from 'src/stock/lot/types/relocate-lot-outcome.type';

type LotEvent = ObjectRecordEvent<LotEventRecord>;
type LotEdit = LotRelocationRequest & { event: LotEvent; beforeLocationId: string | null };

type RelocateLotEditsStore = {
  // Per lot: its rows holding positive stock.
  readLotQuantCounts: (lotIds: string[]) => Promise<Map<string, number>>;
  relocateLotBatch: (requests: LotRelocationRequest[]) => Promise<Map<string, LotBatchOutcome>>;
  relocateLot: (lotId: string, toLocationId: string | null) => Promise<RelocateLotOutcome>;
  putBackLocation: (event: LotEvent, locationId: string | null, message: string, values: TranslationValues) => Promise<void>;
  recomputeLot: (lotIds: string[]) => Promise<void>;
  addNotes: (events: LotEvent[], message: string) => Promise<void>;
  // Milliseconds.
  now: () => number;
};

// Stock rows one run moves at most. A run of 25 rows took 20–23 s live.
export const LOT_RUN_QUANTS = 25;
// The trigger stops at 120 s. A run after the first starts only when the time spent, the slowest run so far and the
// put-back of every stocked lot after it still fit in 90 s, counting 0.4 s a lot: the slowest put-back measured one
// lot at a time (it is written in bulk, so it is usually much shorter). So a save stops by about 90 s unless a run
// is slower than the ones before it. The first run always starts, so a save of 200 lots can also end at that run plus
// the put-back of up to 199 lots: 23 s + 199 × 0.4 s, about 103 s at worst, and 93 s when each lot has one stock row.
export const LOT_SAVE_LIMIT_MS = 90_000;
export const LOT_PUT_BACK_MS = 400;
export const TOO_MANY_LOTS_MESSAGE = 'Too many lots in one save; set the location again for this lot.';

const OBJECT = { objectSingular: 'stockLot', objectPlural: 'stockLots' } as const;

// A user who sets a lot's location moves its stock there; the lots of one save move together, a run at a time while
// the time allows. A refused move puts back the location the lot had. A lot another run moves, or one no run had
// the time to take, shows where its stock is again, with a note.
export const makeRelocateLotEdits = (store: RelocateLotEditsStore) => async (events: LotEvent[]) => {
  const started = store.now();
  const errors = errorCollector();
  const edits: LotEdit[] = events.flatMap((event) => {
    const before = eventBefore(event);
    const after = eventAfter(event);

    return before === undefined || after === undefined || before.locationId === after.locationId || !isStaffChange('updated', event, after)
      ? []
      : [{ lotId: event.recordId, toLocationId: after.locationId, event, beforeLocationId: before.locationId }];
  });

  if (edits.length === 0) {
    return;
  }

  const quantCounts = await store.readLotQuantCounts([...new Set(edits.map((edit) => edit.lotId))]);

  // A lot without stock keeps the location typed on it: none of its stock moved, so there is nothing to put back.
  const stocked = (edited: LotEdit[]) => edited.filter((edit) => (quantCounts.get(edit.lotId) ?? 0) > 0);

  const putBackWithNote = async (edited: LotEdit[], message: string) => {
    const lots = stocked(edited);

    if (lots.length === 0) {
      return;
    }
    await errors.run('recompute', () => store.recomputeLot(lots.map((edit) => edit.lotId)));
    await errors.run('Notes', () => store.addNotes(lots.map((edit) => edit.event), message));
  };

  const settle = async (run: LotEdit[], outcomes: Map<string, LotBatchOutcome>) => {
    const held: LotEdit[] = [];

    for (const edit of run) {
      await errors.run(edit.lotId, async () => {
        const batchOutcome = outcomes.get(edit.lotId) ?? { kind: 'done' };
        // A stopped run holds the lot: moved alone, that run is finished first.
        const outcome = batchOutcome.kind === 'stale' ? await store.relocateLot(edit.lotId, edit.toLocationId) : batchOutcome;

        if (outcome.kind === 'refused') {
          await store.putBackLocation(edit.event, edit.beforeLocationId, outcome.reason, outcome.values);
        } else if (outcome.kind === 'held') {
          held.push(edit);
        }
      });
    }
    await putBackWithNote(held, CLAIM_HELD_MESSAGE);
  };

  const runs = planLotRelocationRuns({ edits, quantCounts, maxQuants: LOT_RUN_QUANTS });
  const putBackMsAfter = (index: number) => stocked(runs.slice(index + 1).flat()).length * LOT_PUT_BACK_MS;
  let slowest = 0;

  for (const [index, run] of runs.entries()) {
    if (index > 0 && store.now() - started + slowest + putBackMsAfter(index) > LOT_SAVE_LIMIT_MS) {
      await putBackWithNote(runs.slice(index).flat(), TOO_MANY_LOTS_MESSAGE);
      break;
    }
    const runStarted = store.now();

    await errors.run(run.map((edit) => edit.lotId).join(', '), async () =>
      settle(run, await store.relocateLotBatch(run.map(({ lotId, toLocationId }) => ({ lotId, toLocationId })))),
    );
    slowest = Math.max(slowest, store.now() - runStarted);
  }
  errors.throwIfAny();
};

export const relocateLotEdits = makeRelocateLotEdits({
  readLotQuantCounts: async (lotIds) =>
    countBy(await stockQuants.find<{ lotId: string }>({ lotId: { in: lotIds }, quantity: { gt: 0 } }, 'lotId'), (quant) => quant.lotId),
  relocateLotBatch,
  relocateLot,
  putBackLocation: (event, locationId, message, values) =>
    putBackForEvent({ ...OBJECT, event, data: { locationId }, message, values }),
  recomputeLot,
  addNotes: async (events, message) => {
    const bodies = new Map<string | undefined, Promise<string>>();
    const bodyFor = (event: LotEvent) => {
      const body = bodies.get(event.workspaceMemberId) ?? localizedReason(event, message);

      bodies.set(event.workspaceMemberId, body);
      return body;
    };

    await addNotes(
      OBJECT.objectSingular,
      await Promise.all(events.map(async (event) => ({ recordId: event.recordId, title: 'Change undone', body: await bodyFor(event) }))),
    );
  },
  now: () => Date.now(),
});
