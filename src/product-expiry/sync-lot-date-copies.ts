import { backoffMs } from 'src/shared/backoff';
import { compareAndSet } from 'src/shared/compare-and-set';
import { findMany } from 'src/shared/triggers/records';
import { errorCollector } from 'src/shared/triggers/retry-on-conflict';
import { distinctIds } from 'src/shared/utils/distinct-ids.util';
import { settleLotLineDates } from 'src/product-expiry/settle-move-line-dates';
import { planLotQuantDates } from 'src/product-expiry/utils/lot-quant-dates.util';
import { stockLots } from 'src/stock/lot/lot-records';
import { QUANT_SNAPSHOT_SELECTION, toSnapshot } from 'src/stock/quant/quant-store';
import { stockQuants } from 'src/stock/stock-records';
import { nowIso, readStockSettings } from 'src/stock/stock-settings';
import { type SyncLotDateCopiesStore } from 'src/product-expiry/types/sync-lot-date-copies-store.type';
import { type LotExpiry } from 'src/product-expiry/utils/types/lot-expiry.type';
import { type LotQuant } from 'src/product-expiry/utils/types/lot-quant.type';

type LotQuantRow = Parameters<typeof toSnapshot>[0] & { lotId: string; expirationDate: string | null };

// One read plus up to three retries when a stock row moved while its dates were written.
const PASSES = 4;

const toLotQuant = (row: LotQuantRow): LotQuant => ({
  ...toSnapshot(row),
  lotId: row.lotId,
  expirationDate: row.expirationDate,
});

// The lot's stock rows carry its dates and its available stock; its lines, done or not, work their dates out again
// from the lot. A cancelled line keeps its dates. The lines are settled even when the stock rows kept changing.
export const makeSyncLotDateCopies = (store: SyncLotDateCopiesStore) => async (lotIds: string[]) => {
  const ids = distinctIds(lotIds);

  if (ids.length === 0) {
    return;
  }
  const errors = errorCollector();

  await errors.run('stock rows', async () => {
    for (let pass = 1; pass <= PASSES; pass += 1) {
      const { lots, quants } = await store.readLotsAndQuants(ids);
      let missed = 0;

      for (const { id, version, data } of planLotQuantDates({ lots, quants, now: store.now(), digits: store.digits() })) {
        if (!(await store.compareAndSet(id, version, data))) {
          missed += 1;
        }
      }
      if (missed === 0) {
        return;
      }
      if (pass === PASSES) {
        throw new Error(`${missed} stock rows of the lot kept changing while its dates were copied onto them.`);
      }
      await store.wait(backoffMs(pass));
    }
  });
  await errors.run('lines', () => store.settleLotLineDates(ids));
  errors.throwIfAny();
};

export const syncLotDateCopies = makeSyncLotDateCopies({
  readLotsAndQuants: async (ids) => {
    const { lots, lotQuants } = await findMany<{ lots: (LotExpiry & { id: string })[]; lotQuants: LotQuantRow[] }>({
      lots: { of: stockLots, filter: { id: { in: ids } }, selection: 'id expirationDate removalDate' },
      lotQuants: {
        of: stockQuants,
        filter: { lotId: { in: ids } },
        selection: `${QUANT_SNAPSHOT_SELECTION} lotId expirationDate`,
      },
    });

    return { lots, quants: lotQuants.map(toLotQuant) };
  },
  compareAndSet: (id, version, data) =>
    compareAndSet({ objectSingular: 'stockQuant', objectPlural: 'stockQuants', id, version, data }),
  settleLotLineDates,
  wait: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
  now: nowIso,
  digits: () => readStockSettings().productUnitDigits,
});
