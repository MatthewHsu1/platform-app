import { backoffMs } from 'src/shared/backoff';
import { floatRound } from 'src/shared/utils/float-round.util';
import { parseQuantKey } from 'src/stock/quant/quant-key';
import { graphqlQuantStore } from 'src/stock/quant/quant-store';
import { bypassesReservation } from 'src/stock/utils/location-usage.util';
import { planQuantWrite } from 'src/stock/utils/plan-quant-delta.util';
import { compareAtDigits } from 'src/stock/utils/stock-uom.util';
import { type QuantStore } from 'src/stock/quant/types/quant-store.type';
import { type LocationUsage } from 'src/stock/types/location-usage.type';

// One read plus up to three corrections: a line added or removed while the
// sum is written makes the next pass write the new sum.
const PASSES = 4;

// Reserved is not a running balance: it is the sum of the open lines taking
// from the key, written with compare-and-set.
export const makeRecomputeReserved = (store: QuantStore) => async (keys: string[]) => {
  const digits = store.digits();
  const usageByLocation = new Map<string, LocationUsage>();
  const usageOf = async (locationId: string) => {
    const usage = usageByLocation.get(locationId) ?? (await store.locationUsage(locationId));

    usageByLocation.set(locationId, usage);
    return usage;
  };

  for (const key of [...new Set(keys)]) {
    const bypass = bypassesReservation(await usageOf(parseQuantKey(key).locationId));

    for (let pass = 1; pass <= PASSES; pass += 1) {
      const lines = bypass ? [] : await store.openLines(key);
      const sum = floatRound(
        lines.reduce((total, line) => total + line.quantityProductUom, 0),
        10 ** -digits,
        'HALF-UP',
      );
      const quant = await store.findByKey(key);

      if (quant === null) {
        if (compareAtDigits(sum, 0, digits) === 0) {
          break;
        }
        await store.create(key, { quantity: 0, reservedQuantity: sum, inDate: store.now() });
        continue;
      }
      if (compareAtDigits(quant.reservedQuantity, sum, digits) === 0) {
        break;
      }
      const written = await store.compareAndSet(quant.id, quant.version, planQuantWrite({ quant, reservedQuantity: sum, digits, now: store.now() }));

      if (!written && pass < PASSES) {
        await store.wait(backoffMs(pass));
      }
    }
  }
};

export const recomputeReserved = makeRecomputeReserved(graphqlQuantStore);
