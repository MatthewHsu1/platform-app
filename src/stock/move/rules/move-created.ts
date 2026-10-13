import { type ObjectRecordEvent } from 'twenty-sdk/define';

import { type RecordOperation } from 'src/shared/triggers/batch-events';
import { type ErrorCollector } from 'src/shared/triggers/retry-on-conflict';
import { readLocations } from 'src/stock/location/read-locations';
import { confirmMoves } from 'src/stock/move/actions/confirm-moves';
import { setMoveQuantity } from 'src/stock/move/actions/set-move-quantity';
import { recomputeMove } from 'src/stock/move/recompute-move';
import { copyPickingReferences } from 'src/stock/move/rules/move-picking';
import { runOrderpointsForConfirmedMoves } from 'src/stock/orderpoint/run-orderpoints-for-confirmed-moves';
import { recomputePickingState } from 'src/stock/picking/recompute-picking-state';
import { readPicking, readPickingType } from 'src/stock/picking/read-picking';
import { readStockProducts } from 'src/stock/product/read-stock-products';
import { recomputeProductQuantities } from 'src/stock/product/recompute-product-quantities';
import { isStaffEvent } from 'src/stock/stock-event-helpers';
import { MOVE_STATE, PICKING_STATE } from 'src/stock/stock-options.constant';
import { stockMoves } from 'src/stock/stock-records';
import { MOVE_ROW } from 'src/stock/stock-rows';
import { planMoveCreate } from 'src/stock/utils/plan-move-rules.util';
import { OPEN_MOVE_STATES_FOR_FORECAST } from 'src/stock/utils/plan-product-quantities.util';
import { type MoveEventRecord } from 'src/stock/move/types/move-event-record.type';
import { type MoveRow } from 'src/stock/types/move-row.type';

// A move added to a running transfer confirms the
// transfer's draft moves again, and a draft move created with a quantity is confirmed.
export const handleMoveCreated = async (
  events: ObjectRecordEvent<MoveEventRecord>[],
  operation: RecordOperation,
  errors: ErrorCollector,
) => {
  if (operation !== 'created') {
    return;
  }
  const created = events.filter((event) => isStaffEvent(operation, event));

  if (created.length === 0) {
    return;
  }
  const createdIds: string[] = [];
  const typedQuantities: { moveId: string; quantity: number }[] = [];
  const autoconfirmPickingIds = new Set<string>();
  const openPickingIds = new Set<string>();
  const pickingIds = new Set<string>();
  const productIds = new Set<string>();

  for (const event of created) {
    await errors.run(event.recordId, async () => {
      const [move] = await stockMoves.find<MoveRow>({ id: { eq: event.recordId } }, MOVE_ROW);

      if (move === undefined) {
        return;
      }
      const picking = move.pickingId === null ? undefined : await readPicking(move.pickingId);
      const type = await readPickingType(move.pickingTypeId ?? picking?.pickingTypeId ?? null);
      const product = (await readStockProducts([move.productId])).get(move.productId);

      if (product === undefined) {
        return;
      }
      const locations = await readLocations(
        [
          picking?.locationId,
          picking?.locationDestId,
          type?.defaultLocationSrcId,
          type?.defaultLocationDestId,
          move.locationId,
          move.locationDestId,
          move.locationFinalId,
        ].flatMap((id) => (id == null ? [] : [id])),
      );
      const plan = planMoveCreate({
        move,
        picking: picking ?? null,
        pickingType: type ?? null,
        productUomId: product.uomId,
        locations,
      });

      await stockMoves.update(move.id, plan.data);
      await copyPickingReferences([move.id]);
      createdIds.push(move.id);
      productIds.add(move.productId);
      if (picking !== undefined) {
        pickingIds.add(picking.id);
        if (plan.autoconfirm) {
          autoconfirmPickingIds.add(picking.id);
        }
        if (picking.state !== PICKING_STATE.DONE && picking.state !== PICKING_STATE.CANCEL) {
          openPickingIds.add(picking.id);
        }
      }
      if ((move.quantity ?? 0) !== 0 && plan.data.state !== MOVE_STATE.DONE) {
        typedQuantities.push({ moveId: move.id, quantity: move.quantity ?? 0 });
      }
    });
  }
  for (const { moveId, quantity } of typedQuantities) {
    await errors.run(`${moveId} quantity`, () => setMoveQuantity(moveId, quantity));
  }
  await errors.run('autoconfirm', async () => {
    if (openPickingIds.size === 0) {
      return;
    }
    const drafts = await stockMoves.find<{ id: string; pickingId: string; quantity: number | null }>(
      { pickingId: { in: [...openPickingIds] }, state: { eq: MOVE_STATE.DRAFT } },
      'id pickingId quantity',
    );
    const toConfirm = drafts
      .filter((move) => autoconfirmPickingIds.has(move.pickingId) || (move.quantity ?? 0) !== 0)
      .map((move) => move.id);

    if (toConfirm.length > 0) {
      await confirmMoves(toConfirm, { merge: true, createProcurement: true });
    }
    // Adding a move confirms its running transfer again, which orders for
    // the automatic rules of all its running moves, as Mark as Todo does.
    if (autoconfirmPickingIds.size > 0) {
      const running = await stockMoves.find<{ id: string }>(
        { pickingId: { in: [...autoconfirmPickingIds] }, state: { in: OPEN_MOVE_STATES_FOR_FORECAST } },
        'id',
      );

      await runOrderpointsForConfirmedMoves(running.map((move) => move.id));
    }
  });
  await errors.run('recompute', async () => {
    if (createdIds.length === 0) {
      return;
    }
    const alive = await stockMoves.find<{ id: string }>({ id: { in: createdIds } }, 'id');

    await recomputeMove(alive.map((move) => move.id));
    await recomputePickingState([...pickingIds]);
    await recomputeProductQuantities([...productIds]);
  });
};
