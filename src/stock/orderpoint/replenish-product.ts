import { graphqlClaimStore } from 'src/shared/claims/claim-store';
import { CLAIM_HELD_MESSAGE, claimKey } from 'src/shared/claims/claim';
import { textOrNull } from 'src/shared/utils/text-or-null.util';
import { ORDERPOINT_MESSAGES } from 'src/stock/orderpoint/orderpoint-messages.constant';
import { replayedOrderText } from 'src/stock/orderpoint/utils/replayed-order-text.util';
import { resumeProcurementClaim, runClaimedProcurements } from 'src/stock/procurement/claimed-procurements';
import { StockUserError } from 'src/stock/stock-errors';
import { stockMoves } from 'src/stock/stock-records';
import { type ReplenishOutcome } from 'src/stock/orderpoint/types/replenish-outcome.type';
import { type ReplenishedMove } from 'src/stock/orderpoint/types/replenished-move.type';
import { type ReplenishProductDeps } from 'src/stock/orderpoint/types/replenish-product-deps.type';
import { type Procurement } from 'src/stock/utils/procurement/types/procurement.type';

// One replenishment of a product, claimed per product so a double click never
// orders twice. A click that finds an order of the product stopped after its
// first write finishes that order, orders nothing of its own and says so. An
// order stopped before its first write wrote nothing: it is freed, and the
// click orders what it asks. Once the order is written, nothing after it may
// fail the click: a retry would order twice.
export const makeReplenishProduct =
  ({ findClaim, resumeProcurementClaim: resume, runClaimedProcurements: run, readFirstMove }: ReplenishProductDeps) =>
  async (procurement: Procurement): Promise<ReplenishOutcome> => {
    if (procurement.productQty < 0) {
      throw new StockUserError(ORDERPOINT_MESSAGES.replenishNegative);
    }
    const key = claimKey('replenish', procurement.productId);
    const existing = await findClaim(key);

    if (existing !== null && existing.progress?.committed !== true && (await resume(key)) === 'held') {
      throw new StockUserError(CLAIM_HELD_MESSAGE);
    }
    let replayed = false;
    const moveIds = await run(key, [procurement], {
      onReplay: () => {
        replayed = true;
      },
    });
    const first = await readFirstMove(moveIds).then(
      (move) => ({ read: true as const, move }),
      () => ({ read: false as const, move: null }),
    );

    if (replayed) {
      const text = replayedOrderText(first.move);

      throw new StockUserError(text.message, text.values);
    }

    return first.read ? { kind: 'ordered', pickingName: first.move?.pickingName ?? null } : { kind: 'unconfirmed' };
  };

const readFirstMove = async (moveIds: string[]): Promise<ReplenishedMove | null> => {
  const [firstId] = moveIds;
  const [move] =
    firstId === undefined
      ? []
      : await stockMoves.find<{
          productUomQty: number | null;
          productUom: { name: string | null } | null;
          picking: { name: string | null } | null;
        }>({ id: { eq: firstId } }, 'productUomQty productUom { deletedAt name } picking { deletedAt name }');

  return move === undefined
    ? null
    : {
        quantity: move.productUomQty ?? 0,
        unitName: move.productUom?.name ?? '',
        pickingName: textOrNull(move.picking?.name ?? null),
      };
};

export const replenishProduct = makeReplenishProduct({
  findClaim: graphqlClaimStore.findByKey,
  resumeProcurementClaim,
  runClaimedProcurements,
  readFirstMove,
});
