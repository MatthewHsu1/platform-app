import { makeApplyQuantDelta } from 'src/stock/quant/apply-quant-delta';
import { graphqlQuantStore } from 'src/stock/quant/quant-store';
import { makeRecomputeKeyFromLedger } from 'src/stock/quant/recompute-key-from-ledger';
import { compareAtDigits } from 'src/stock/utils/stock-uom.util';
import { type QuantStore } from 'src/stock/quant/types/quant-store.type';

// The resume path of a run that stopped between a line's commit and its deltas. The line is in
// the ledger, so the key should hold the ledger total: when it already does, the delta landed;
// when it is short of exactly the delta, the delta is posted now, with the in-date rule a clean
// run applies; otherwise (another run is posting on the key) it is set to the ledger total.
export const makeSettleQuantDelta = (store: QuantStore) => {
  const applyQuantDelta = makeApplyQuantDelta(store);
  const recomputeKeyFromLedger = makeRecomputeKeyFromLedger(store);

  return async ({ key, delta, inDate }: { key: string; delta: number; inDate: string | null }): Promise<{ inDate: string | null }> => {
    const digits = store.digits();
    const ledger = await store.ledgerTotal(key);
    const quant = await store.findByKey(key);
    const quantity = quant?.quantity ?? 0;

    if (compareAtDigits(quantity, ledger, digits) === 0) {
      return { inDate: quant?.inDate ?? null };
    }
    if (compareAtDigits(quantity + delta, ledger, digits) === 0) {
      return { inDate: (await applyQuantDelta({ key, delta, inDate })).inDate };
    }
    await recomputeKeyFromLedger(key);

    return { inDate: (await store.findByKey(key))?.inDate ?? null };
  };
};

export const settleQuantDelta = makeSettleQuantDelta(graphqlQuantStore);
