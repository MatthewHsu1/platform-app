import { graphqlLotExpiryStepStore } from 'src/product-expiry/daily/lot-expiry-step-store';
import { planExpiredQuantWrites } from 'src/product-expiry/utils/expired-stock.util';
import { lotsToRemind } from 'src/product-expiry/utils/expiry-confirmation.util';
import { freeQuantityCutoff } from 'src/product-expiry/utils/expiry-quantities.util';
import { translate } from 'src/shared/i18n/translate';
import { errorCollector } from 'src/shared/triggers/retry-on-conflict';
import { derivedId } from 'src/shared/utils/derived-id.util';
import { type LotExpiryStepStore } from 'src/product-expiry/types/lot-expiry-step-store.type';

// One read plus up to three retries when a stock row moved while its available quantity was written.
const PASSES = 4;
const PRODUCT_CHUNK = 50;

// Everything is picked by its dates, not by what changed since yesterday, so a day the job did not run is caught
// up the next time. Tasks are in English: no user is clicking.
export const makeRunLotExpiryStep =
  (store: LotExpiryStepStore) =>
  async (now: Date = new Date()) => {
    const errors = errorCollector();
    const nowIso = now.toISOString();
    const cutoff = freeQuantityCutoff(now).toISOString();

    await errors.run('alert tasks', async () => {
      const lots = await store.readAlertLots(cutoff);

      if (lots.length === 0) {
        return;
      }
      const remind = new Set(lotsToRemind(lots, await store.readStockedLotIds(lots.map((lot) => lot.id)), now));

      for (const lot of lots.filter((row) => remind.has(row.id))) {
        await errors.run(`alert task of lot ${lot.id}`, async () => {
          await store.addLotTask({
            id: derivedId('lotAlert', lot.id),
            lotId: lot.id,
            title: translate('en', 'Alert Date Reached'),
            body: translate('en', 'The alert date has been reached for this lot/serial number'),
            assigneeId: lot.responsibleId,
            dueAt: nowIso,
          });
          await store.markReminded(lot.id);
        });
      }
    });

    await errors.run('expired flags', async () => {
      const lotIds = await store.readLotsToFlag(nowIso);

      if (lotIds.length > 0) {
        await store.recomputeLotExpiry(lotIds, now);
      }
    });

    // Free and forecast quantities are stored too and move with the clock, so the products holding expired stock
    // are worked out again with the rows written here.
    const productIds = new Set<string>();

    await errors.run('expired stock rows', async () => {
      for (let pass = 1; pass <= PASSES; pass += 1) {
        const quants = await store.readStaleQuants(nowIso);
        let missed = 0;

        for (const write of planExpiredQuantWrites({ quants, now: nowIso, digits: store.digits() })) {
          if (await store.writeQuant(write)) {
            productIds.add(quants.find((quant) => quant.id === write.id)?.productId ?? '');
          } else {
            missed += 1;
          }
        }
        if (missed === 0) {
          return;
        }
        if (pass === PASSES) {
          throw new Error(`${missed} expired stock rows kept changing while their available quantity was written.`);
        }
        await store.wait(pass);
      }
    });

    await errors.run('products with expired stock', async () => {
      for (const productId of await store.readProductsWithExpiredStock(cutoff)) {
        productIds.add(productId);
      }
    });
    const ids = [...productIds].filter((id) => id !== '');

    for (let start = 0; start < ids.length; start += PRODUCT_CHUNK) {
      const part = ids.slice(start, start + PRODUCT_CHUNK);

      await errors.run(`quantities of ${part.length} products`, () => store.recomputeProductQuantities(part));
    }
    errors.throwIfAny();
  };

export const runLotExpiryStep = makeRunLotExpiryStep(graphqlLotExpiryStepStore);
