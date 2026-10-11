import { stockLots } from 'src/stock/lot/lot-records';
import { readScopeLocationIds } from 'src/stock/product/recompute-product-quantities';
import { stockQuants } from 'src/stock/stock-records';
import { planLotSummary } from 'src/stock/utils/plan-lot-location.util';
import { type RecomputeLotOptions } from 'src/stock/lot/types/recompute-lot-options.type';

type LotSummaryRow = { id: string; locationId: string | null; productQty: number | null };
type LotQuantRow = { lotId: string; locationId: string; quantity: number };

type RecomputeLotStore = {
  readLots: (ids: string[]) => Promise<LotSummaryRow[]>;
  readLotQuants: (lotIds: string[]) => Promise<LotQuantRow[]>;
  readScopeLocationIds: () => Promise<Set<string>>;
  updateLots: (ids: string[], data: Record<string, unknown>) => Promise<void>;
};

// The one writer of a lot's location and on-hand quantity.
export const makeRecomputeLot = (store: RecomputeLotStore) => async (lotIds: string[], options: RecomputeLotOptions = {}) => {
  const ids = [...new Set(lotIds)];

  if (ids.length === 0) {
    return;
  }
  const [lots, lotQuants, scopeLocationIds] = await Promise.all([
    store.readLots(ids),
    store.readLotQuants(ids),
    store.readScopeLocationIds(),
  ]);
  // Lots that take the same values are written together, so a put-back of many lots stays a few requests.
  const writes = new Map<string, { ids: string[]; data: Record<string, unknown> }>();

  for (const lot of lots) {
    const quants = lotQuants.filter((quant) => quant.lotId === lot.id);

    if (options.keepWhenEmpty === true && !quants.some((quant) => quant.quantity > 0)) {
      continue;
    }
    const summary = planLotSummary({ quants, scopeLocationIds });
    const data: Record<string, unknown> = {};

    if (summary.locationId !== lot.locationId) {
      data.locationId = summary.locationId;
    }
    if (summary.productQty !== (lot.productQty ?? 0)) {
      data.productQty = summary.productQty;
    }
    if (Object.keys(data).length > 0) {
      const key = JSON.stringify(data);
      const write = writes.get(key) ?? { ids: [], data };

      write.ids.push(lot.id);
      writes.set(key, write);
    }
  }
  for (const { ids: lotIdsToWrite, data } of writes.values()) {
    await store.updateLots(lotIdsToWrite, data);
  }
};

export const recomputeLot = makeRecomputeLot({
  readLots: (ids) => stockLots.find<LotSummaryRow>({ id: { in: ids } }, 'id locationId productQty'),
  readLotQuants: (lotIds) => stockQuants.find<LotQuantRow>({ lotId: { in: lotIds } }, 'lotId locationId quantity'),
  readScopeLocationIds,
  updateLots: (ids, data) => stockLots.updateMany(ids, data),
});
