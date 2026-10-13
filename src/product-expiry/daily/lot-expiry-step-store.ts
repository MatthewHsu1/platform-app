import { backoffMs } from 'src/shared/backoff';
import { compareAndSet } from 'src/shared/compare-and-set';
import { recomputeLotExpiry } from 'src/product-expiry/recompute-lot-expiry';
import { stockLots } from 'src/stock/lot/lot-records';
import { readScopeLocationIds, recomputeProductQuantities } from 'src/stock/product/recompute-product-quantities';
import { QUANT_SNAPSHOT_SELECTION, toSnapshot } from 'src/stock/quant/quant-store';
import { LOCATION_USAGE } from 'src/stock/stock-options.constant';
import { productProducts, productTemplates, stockLocations, stockQuants } from 'src/stock/stock-records';
import { readStockSettings } from 'src/stock/stock-settings';
import { addTask } from 'src/stock/stock-tasks';
import { type LotExpiryStepStore } from 'src/product-expiry/types/lot-expiry-step-store.type';
import { chunks } from 'src/shared/utils/chunks.util';

type AlertLotRow = {
  id: string;
  alertDate: string | null;
  productExpiryReminded: boolean | null;
  product: { productTmpl: { responsibleId: string | null } | null } | null;
};

type StaleQuantRow = Parameters<typeof toSnapshot>[0] & { productId: string; availableQuantity: number | null };

const notTrue = (field: string) => ({ or: [{ [field]: { eq: false } }, { [field]: { is: 'NULL' } }] });

// Ids sent in one `in` list per request.
const ID_CHUNK = 200;

// Only stock of products that use expiry dates stops being available with the clock.
const readExpiryProductIds = async () => {
  const templates = await productTemplates.find<{ id: string }>({ useExpirationDate: { eq: true } }, 'id');
  const products = await productProducts.find<{ id: string }>(
    { productTmplId: { in: templates.map((template) => template.id) } },
    'id',
  );

  return products.map((product) => product.id);
};

const findInChunks = async <TRow>(ids: string[], filterOf: (part: string[]) => Record<string, unknown>, selection: string) => {
  const rows: TRow[] = [];

  for (const part of chunks(ids, ID_CHUNK)) {
    rows.push(...(await stockQuants.find<TRow>(filterOf(part), selection)));
  }
  return rows;
};

export const graphqlLotExpiryStepStore: LotExpiryStepStore = {
  readAlertLots: async (cutoff) =>
    (
      await stockLots.find<AlertLotRow>(
        { and: [{ alertDate: { lte: cutoff } }, notTrue('productExpiryReminded')] },
        // Twenty drops a relation nested under a to-one relation unless that relation
        // also selects deletedAt.
        'id alertDate productExpiryReminded product { deletedAt productTmpl { responsibleId } }',
      )
    ).map((lot) => ({
      id: lot.id,
      alertDate: lot.alertDate,
      productExpiryReminded: lot.productExpiryReminded === true,
      responsibleId: lot.product?.productTmpl?.responsibleId ?? null,
    })),

  readStockedLotIds: async (lotIds) => {
    const internal = await stockLocations.find<{ id: string }>({ usage: { eq: LOCATION_USAGE.INTERNAL } }, 'id');
    const internalIds = internal.map((location) => location.id);
    const stocked = await findInChunks<{ lotId: string }>(
      lotIds,
      (part) => ({ lotId: { in: part }, quantity: { gt: 0 }, locationId: { in: internalIds } }),
      'lotId',
    );

    return new Set(stocked.map((quant) => quant.lotId));
  },

  addLotTask: ({ id, lotId, title, body, assigneeId, dueAt }) =>
    addTask({ objectSingular: 'stockLot', recordId: lotId, title, body, assigneeId, dueAt, id }),

  markReminded: (lotId) => stockLots.update(lotId, { productExpiryReminded: true }),

  readLotsToFlag: async (now) =>
    (
      await stockLots.find<{ id: string }>({ and: [{ expirationDate: { lte: now } }, notTrue('productExpiryAlert')] }, 'id')
    ).map((lot) => lot.id),

  recomputeLotExpiry,

  // Rows past their removal date that still show stock as available; a row already at 0 is not read again.
  readStaleQuants: async (now) =>
    (
      await findInChunks<StaleQuantRow>(
        await readExpiryProductIds(),
        (part) => ({
          and: [
            { productId: { in: part } },
            { removalDate: { lte: now } },
            { or: [{ availableQuantity: { neq: 0 } }, { availableQuantity: { is: 'NULL' } }] },
          ],
        }),
        `${QUANT_SNAPSHOT_SELECTION} productId availableQuantity`,
      )
    ).map((row) => ({ ...toSnapshot(row), productId: row.productId, availableQuantity: row.availableQuantity })),

  writeQuant: ({ id, version, data }) => compareAndSet({ objectSingular: 'stockQuant', objectPlural: 'stockQuants', id, version, data }),

  readProductsWithExpiredStock: async (cutoff) => {
    const scope = [...(await readScopeLocationIds())];
    const quants = await findInChunks<{ productId: string }>(
      await readExpiryProductIds(),
      (part) => ({ productId: { in: part }, removalDate: { lte: cutoff }, quantity: { gt: 0 }, locationId: { in: scope } }),
      'productId',
    );

    return [...new Set(quants.map((quant) => quant.productId))];
  },

  recomputeProductQuantities,
  digits: () => readStockSettings().productUnitDigits,
  wait: (attempt) => new Promise((resolve) => setTimeout(resolve, backoffMs(attempt))),
};
