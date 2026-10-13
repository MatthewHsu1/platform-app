import { backoffMs } from 'src/shared/backoff';
import { translate } from 'src/shared/i18n/translate';
import { graphqlQuantStore } from 'src/stock/quant/quant-store';
import { planQuantWrite } from 'src/stock/utils/plan-quant-delta.util';
import { compareAtDigits } from 'src/stock/utils/stock-uom.util';
import { type QuantStore } from 'src/stock/quant/types/quant-store.type';

const ATTEMPTS = 10;

// The resume path of Validate: a line already done may or may not have moved
// its stock, so the key's on hand is set to what the done lines add up to.
export const makeRecomputeKeyFromLedger = (store: QuantStore) => async (key: string) => {
  const digits = store.digits();

  for (let attempt = 1; attempt <= ATTEMPTS; attempt += 1) {
    // Read on each try: a clash may be a Validate that just posted a line.
    const ledger = await store.ledgerTotal(key);
    const quant =
      (await store.findByKey(key)) ??
      (await store.create(key, { quantity: 0, reservedQuantity: 0, inDate: store.now() })) ??
      (await store.findByKey(key));

    if (quant !== null) {
      if (compareAtDigits(quant.quantity, ledger, digits) === 0) {
        return;
      }
      if (await store.compareAndSet(quant.id, quant.version, planQuantWrite({ quant, quantity: ledger, digits, now: store.now() }))) {
        return;
      }
    }
    if (attempt < ATTEMPTS) {
      await store.wait(backoffMs(attempt));
    }
  }
  throw new Error(
    translate(null, 'Could not set the stock level {key} from the done lines after {attempts} tries.', { key, attempts: ATTEMPTS }),
  );
};

export const recomputeKeyFromLedger = makeRecomputeKeyFromLedger(graphqlQuantStore);
