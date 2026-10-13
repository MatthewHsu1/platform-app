import { backoffMs } from 'src/shared/backoff';
import { translate } from 'src/shared/i18n/translate';
import { parseQuantKey } from 'src/stock/quant/quant-key';
import { graphqlQuantStore } from 'src/stock/quant/quant-store';
import { bypassesReservation } from 'src/stock/utils/location-usage.util';
import { planQuantDeltaWrite } from 'src/stock/utils/plan-quant-delta.util';
import { type QuantStore } from 'src/stock/quant/types/quant-store.type';

const ATTEMPTS = 10;

// The running balance, made safe by compare-and-set on the
// row's version: a write that finds another version reads again and retries.
export const makeApplyQuantDelta =
  (store: QuantStore) =>
  async ({
    key,
    delta,
    inDate,
  }: {
    key: string;
    delta: number;
    inDate: string | null;
  }): Promise<{ quantId: string; quantity: number; inDate: string }> => {
    const bypass = bypassesReservation(await store.locationUsage(parseQuantKey(key).locationId));

    for (let attempt = 1; attempt <= ATTEMPTS; attempt += 1) {
      const quant =
        (await store.findByKey(key)) ??
        (await store.create(key, { quantity: 0, reservedQuantity: 0, inDate: store.now() })) ??
        (await store.findByKey(key));

      if (quant !== null) {
        const write = planQuantDeltaWrite({
          quant,
          delta,
          incomingInDate: inDate,
          bypassesReservation: bypass,
          now: store.now(),
          digits: store.digits(),
        });

        if (await store.compareAndSet(quant.id, quant.version, write.data)) {
          return { quantId: quant.id, quantity: write.quantity, inDate: write.inDate };
        }
      }
      if (attempt < ATTEMPTS) {
        await store.wait(backoffMs(attempt));
      }
    }
    throw new Error(translate(null, 'Could not update the stock level {key} after {attempts} tries.', { key, attempts: ATTEMPTS }));
  };

export const applyQuantDelta = makeApplyQuantDelta(graphqlQuantStore);
