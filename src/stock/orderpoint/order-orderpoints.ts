import { randomUUID } from 'node:crypto';

import { CLAIM_HELD_MESSAGE } from 'src/shared/claims/claim';
import { ProcurementFailure } from 'src/stock/procurement/apply-procurement-plan';
import { StockUserError } from 'src/stock/stock-errors';
import { updateAsUser } from 'src/stock/stock-person-writes';
import { stockMoves } from 'src/stock/stock-records';
import { readStockSettings } from 'src/stock/stock-settings';
import { ORDERPOINT_TRIGGER } from 'src/stock/stock-options.constant';
import { readResolvedUoms } from 'src/stock/stock-uoms';
import { finishOrder } from 'src/stock/orderpoint/finish-order';
import {
  completeOrderFinish,
  releaseOrderpointClaims,
  markOrderChunk,
  settleOrderRun,
  startOrderFinish,
  takeOrderpointClaims,
} from 'src/stock/orderpoint/orderpoint-claims';
import { ORDERPOINT_MESSAGES } from 'src/stock/orderpoint/orderpoint-messages.constant';
import { stockWarehouseOrderpoints } from 'src/stock/orderpoint/orderpoint-records';
import { procureOrderpoints } from 'src/stock/orderpoint/procure-orderpoints';
import { recomputeOrderpoint } from 'src/stock/orderpoint/recompute-orderpoint';
import { orderSuccessMessage } from 'src/stock/orderpoint/utils/order-success-message.util';
import { planOrderRequest } from 'src/stock/orderpoint/utils/plan-order-request.util';
import { type OrderMode } from 'src/stock/orderpoint/types/order-mode.type';
import { type OrderOrderpointsDeps } from 'src/stock/orderpoint/types/order-orderpoints-deps.type';
import { type OrderOutcome } from 'src/stock/orderpoint/types/order-outcome.type';
import { type OrderRow } from 'src/stock/orderpoint/types/order-row.type';
import { type TranslatableText } from 'src/stock/utils/procurement/types/translatable-text.type';

// Order, Order To Max and Automate on the selected reordering rules. The
// rules are claimed so two clicks never order the same rule twice. Every
// check runs before the first write, so a refused click changes nothing; the
// rules are freed again unless the order has started writing, in which case
// the stopped run is finished later under the same claims, its after-order
// steps included.
export const makeOrderOrderpoints =
  (deps: OrderOrderpointsDeps) =>
  async (orderpointIds: string[], mode: OrderMode): Promise<OrderOutcome> => {
    const runId = deps.newRunId();
    const { taken, busy } = await deps.takeClaims(orderpointIds, runId);

    if (busy.length > 0) {
      await deps.releaseClaims(taken, runId);
      throw new StockUserError(CLAIM_HELD_MESSAGE);
    }
    const names = new Map<string, string>();
    let ordered: { outcome: OrderOutcome; finishPending: boolean };

    try {
      ordered = await order(deps, orderpointIds, mode, runId, names);
    } catch (error) {
      // Once a chunk wrote, the order is out: the click finishes it for
      // those rules and says what was left, rather than answer an error.
      const settled = await deps.settleAfterError(taken, runId);

      if (settled.kind === 'nothingWritten') {
        throw error;
      }
      if (settled.kind === 'unknown') {
        return { message: { message: ORDERPOINT_MESSAGES.finishPending }, pickingName: null, details: [] };
      }
      const left =
        settled.kind === 'pending' ? settled.notReachedIds : orderpointIds.filter((id) => !settled.writtenIds.includes(id));
      const details: TranslatableText[] =
        left.length === 0
          ? []
          : [{ message: ORDERPOINT_MESSAGES.notOrdered, values: { rules: left.map((id) => names.get(id) ?? id).join(', ') } }];

      return {
        message: { message: ORDERPOINT_MESSAGES.ordered },
        pickingName: null,
        details: settled.kind === 'pending' ? [...details, { message: ORDERPOINT_MESSAGES.finishPending }] : details,
      };
    }
    // A pending finish keeps the rules: freed now, their typed quantity
    // would be ordered again by the next click. Once finished, a failed
    // release only holds them until the resume frees them.
    if (!ordered.finishPending) {
      await deps.releaseClaims(taken, runId).catch(() => undefined);
    }

    return ordered.outcome;
  };

const order = async (
  deps: OrderOrderpointsDeps,
  orderpointIds: string[],
  mode: OrderMode,
  runId: string,
  names: Map<string, string>,
): Promise<{ outcome: OrderOutcome; finishPending: boolean }> => {
  // Stock changes reach the stored quantities a little later; the order
  // works from the quantities as they are now.
  const recomputed = await deps.recompute(orderpointIds);

  if (recomputed.failures.length > 0) {
    throw new ProcurementFailure(recomputed.failures.map((failure) => failure.error));
  }
  const rows = await deps.readRows(orderpointIds);

  rows.forEach((row) => names.set(row.id, row.name));
  const plan = planOrderRequest({ mode, rows, digits: deps.digits() });

  if (plan.kind === 'refuse') {
    throw new StockUserError(ORDERPOINT_MESSAGES[plan.message]);
  }
  const clearTypedIds = rows.filter((row) => row.qtyToOrderManual !== 0).map((row) => row.id);
  const nothingOrdered = { message: { message: ORDERPOINT_MESSAGES.nothingToOrder }, pickingName: null, details: [] };

  if (plan.nothingToOrder) {
    await deps.finishWithoutOrder({ orderpointIds, clearTypedIds, automaticIds: [] });

    return { outcome: nothingOrdered, finishPending: false };
  }
  const finishPlan = { orderpointIds, clearTypedIds, automaticIds: plan.setAutoIds };
  const result = await deps.procure(orderpointIds, {
    raiseUserError: true,
    runId,
    quantities: plan.quantities,
    onChunkCommit: (ids, procurementRunId) => deps.markChunk(runId, ids, procurementRunId),
    beforeWrite: async () => {
      await deps.startFinish(runId, finishPlan);
      if (plan.setAutoIds.length > 0) {
        await deps.setAutomatic(plan.setAutoIds);
      }
    },
  });

  if (result.kind === 'refused') {
    throw new ProcurementFailure(result.errors);
  }
  const leftOut = new Set([...result.failures.map((failure) => failure.orderpointId), ...result.unprocessedIds]);
  const details: TranslatableText[] = result.failures.map((failure) => failure.error);

  if (result.unprocessedIds.length > 0) {
    details.push({
      message: ORDERPOINT_MESSAGES.notOrdered,
      values: { rules: result.unprocessedIds.map((id) => names.get(id) ?? id).join(', ') },
    });
  }
  const wroteNothing = result.moveIds.length === 0 && leftOut.size === 0;

  // The order is out: an error from here on is not the user's to retry, the
  // resume finishes these steps.
  try {
    // Read before the suggestions are destroyed: a destroyed rule no longer
    // names its moves.
    const firstMove =
      orderpointIds.length === 1 && result.moveIds.length > 0 ? await deps.readFirstMove(result.moveIds, orderpointIds) : null;
    const success = orderSuccessMessage({
      orderpointCount: orderpointIds.length,
      orderpointWarehouseId: rows[0]?.warehouseId ?? null,
      firstMove,
    });

    await deps.completeFinish(
      runId,
      { ...finishPlan, clearTypedIds: clearTypedIds.filter((id) => !leftOut.has(id)) },
      plan.setAutoIds.filter((id) => leftOut.has(id)),
    );

    return {
      outcome: wroteNothing
        ? nothingOrdered
        : { message: { message: ORDERPOINT_MESSAGES[success.message] }, pickingName: success.pickingName, details },
      finishPending: false,
    };
  } catch {
    return {
      outcome: {
        message: { message: wroteNothing ? ORDERPOINT_MESSAGES.nothingToOrder : ORDERPOINT_MESSAGES.ordered },
        pickingName: null,
        details: [...details, { message: ORDERPOINT_MESSAGES.finishPending }],
      },
      finishPending: true,
    };
  }
};

const readRows = async (orderpointIds: string[]): Promise<OrderRow[]> => {
  const units = await readResolvedUoms();
  const rows = await stockWarehouseOrderpoints.find<{
    id: string;
    name: string | null;
    trigger: 'AUTO' | 'MANUAL';
    qtyToOrder: number | null;
    qtyToOrderManual: number | null;
    qtyForecast: number | null;
    productMaxQty: number | null;
    replenishmentUomId: string | null;
    warehouseId: string | null;
    product: { productTmpl: { uomId: string } | null } | null;
  }>(
    { id: { in: orderpointIds } },
    'id name trigger qtyToOrder qtyToOrderManual qtyForecast productMaxQty replenishmentUomId warehouseId product { deletedAt productTmpl { deletedAt uomId } }',
  );

  return rows.flatMap((row) => {
    const productUom = row.product?.productTmpl == null ? undefined : units.get(row.product.productTmpl.uomId);

    return productUom === undefined
      ? []
      : [
          {
            id: row.id,
            name: row.name ?? '',
            trigger: row.trigger,
            qtyToOrder: row.qtyToOrder ?? 0,
            qtyToOrderManual: row.qtyToOrderManual ?? 0,
            qtyForecast: row.qtyForecast ?? 0,
            productMaxQty: row.productMaxQty ?? 0,
            productUom,
            replenishmentUom: row.replenishmentUomId === null ? null : (units.get(row.replenishmentUomId) ?? null),
            warehouseId: row.warehouseId,
          },
        ];
  });
};

// The first move the order made (the procurement lists its moves in the order it
// made them): the one into the rule's own location, not one further up the chain.
const readFirstMove = async (moveIds: string[], orderpointIds: string[]) => {
  const moves = await stockMoves.find<{
    id: string;
    picking: { name: string | null } | null;
    location: { warehouseId: string | null; usage: string | null } | null;
  }>(
    { id: { in: moveIds }, orderpointId: { in: orderpointIds } },
    'id picking { deletedAt name } location { deletedAt warehouseId usage }',
  );
  const [move] = moves.sort((left, right) => moveIds.indexOf(left.id) - moveIds.indexOf(right.id));

  return move === undefined
    ? null
    : {
        locationWarehouseId: move.location?.warehouseId ?? null,
        locationUsage: move.location?.usage ?? '',
        pickingName: move.picking?.name ?? null,
      };
};

export const orderOrderpoints = makeOrderOrderpoints({
  newRunId: () => randomUUID(),
  takeClaims: takeOrderpointClaims,
  releaseClaims: releaseOrderpointClaims,
  settleAfterError: settleOrderRun,
  markChunk: markOrderChunk,
  recompute: recomputeOrderpoint,
  readRows,
  procure: procureOrderpoints,
  setAutomatic: (orderpointIds) => updateAsUser('stockWarehouseOrderpoint', orderpointIds, { trigger: ORDERPOINT_TRIGGER.AUTO }),
  startFinish: startOrderFinish,
  completeFinish: completeOrderFinish,
  finishWithoutOrder: (plan) => finishOrder(plan),
  readFirstMove,
  digits: () => readStockSettings().productUnitDigits,
});
