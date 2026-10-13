import { type ObjectRecordEvent } from 'twenty-sdk/define';

import { type RecordOperation } from 'src/shared/triggers/batch-events';
import { type ErrorCollector } from 'src/shared/triggers/retry-on-conflict';
import { readLocations } from 'src/stock/location/read-locations';
import { assignMoves } from 'src/stock/move/actions/assign-moves';
import { readMoveLinks, unlinkMoves } from 'src/stock/move/move-links';
import { recomputeMove } from 'src/stock/move/recompute-move';
import { recomputePickingState } from 'src/stock/picking/recompute-picking-state';
import { recomputeProductQuantities } from 'src/stock/product/recompute-product-quantities';
import { putawayDestinations } from 'src/stock/putaway/apply-putaway';
import { cutBackOverReservation } from 'src/stock/quant/cut-back-over-reservation';
import { sourceKeyOf } from 'src/stock/quant/quant-key';
import { recomputeReserved } from 'src/stock/quant/recompute-reserved';
import { putBackForEvent } from 'src/stock/stock-put-back';
import { eventBefore, eventChangedFields, isStaffEvent } from 'src/stock/stock-event-helpers';
import { PROCURE_METHOD } from 'src/stock/stock-options.constant';
import { stockMoveLines, stockMoves } from 'src/stock/stock-records';
import { MOVE_LINE_ROW, MOVE_ROW } from 'src/stock/stock-rows';
import { moveLocationRefusal, planMoveLocationChange } from 'src/stock/utils/plan-move-rules.util';
import { type MoveEventRecord } from 'src/stock/move/types/move-event-record.type';
import { type MoveLocationChange } from 'src/stock/move/types/move-location-change.type';
import { type MoveLineRow } from 'src/stock/types/move-line-row.type';
import { type MoveRow } from 'src/stock/types/move-row.type';

// The effect of a location change, also run when a transfer's locations are written onto its moves.
// Returns the moves it refused (a finished line would have been dropped); those are left untouched.
export const applyMoveLocationChange = async (changes: MoveLocationChange[]) => {
  const refused: { moveId: string; message: string }[] = [];
  const touchedKeys = new Set<string>();
  const reassign: string[] = [];
  const recompute = new Set<string>();
  const pickingIds = new Set<string>();
  const productIds = new Set<string>();

  for (const change of changes) {
    const [move] = await stockMoves.find<MoveRow>({ id: { eq: change.moveId } }, MOVE_ROW);

    if (move === undefined) {
      continue;
    }
    const lines = await stockMoveLines.find<MoveLineRow>({ moveId: { eq: move.id } }, MOVE_LINE_ROW);
    const locations = await readLocations([
      ...new Set(
        [move.locationId, move.locationDestId, ...lines.flatMap((line) => [line.locationId, line.locationDestId])].flatMap(
          (id) => (id === null ? [] : [id]),
        ),
      ),
    ]);
    const pathOf = (id: string | null) => (id === null ? null : (locations.get(id)?.parentPath ?? null));
    const refusal = moveLocationRefusal({
      sourceChanged: change.sourceChanged,
      sourcePath: pathOf(move.locationId),
      lines: lines.map((line) => ({ locationPath: pathOf(line.locationId), state: line.state })),
    });

    if (refusal !== null) {
      refused.push({ moveId: move.id, message: refusal });
      continue;
    }
    const plan = planMoveLocationChange({
      sourceChanged: change.sourceChanged,
      destinationChanged: change.destinationChanged,
      sourcePath: pathOf(move.locationId),
      destinationPath: pathOf(move.locationDestId),
      currentWarehouseId: move.warehouseId,
      sourceWarehouseId: move.locationId === null ? null : (locations.get(move.locationId)?.warehouseId ?? null),
      destinationWarehouseId: move.locationDestId === null ? null : (locations.get(move.locationDestId)?.warehouseId ?? null),
      lines: lines.map((line) => ({ id: line.id, locationPath: pathOf(line.locationId), locationDestPath: pathOf(line.locationDestId) })),
    });
    const destroyed = lines.filter((line) => plan.destroyLines.includes(line.id));

    destroyed.forEach((line) => touchedKeys.add(sourceKeyOf(line)));
    await stockMoveLines.destroyMany(plan.destroyLines);

    if (plan.resetSupply) {
      const origIds = (await readMoveLinks([move.id])).origsOf.get(move.id) ?? [];

      await stockMoves.update(move.id, { procureMethod: PROCURE_METHOD.MAKE_TO_STOCK });
      await unlinkMoves(origIds.map((moveOrigId) => ({ moveOrigId, moveDestId: move.id })));
      origIds.forEach((origId) => recompute.add(origId));
      reassign.push(move.id);
    }
    if (plan.relocateLines.length > 0) {
      const relocated = lines.filter((line) => plan.relocateLines.includes(line.id));
      const destinations = await putawayDestinations(
        relocated.map((line) => ({
          key: line.id,
          locationDestId: move.locationDestId ?? '',
          productId: move.productId,
          quantity: line.quantityProductUom ?? line.quantity,
          packageId: line.resultPackageId,
          packagingUomId: move.packagingUomId,
        })),
      );

      for (const line of relocated) {
        await stockMoveLines.update(line.id, { locationDestId: destinations.get(line.id) ?? move.locationDestId });
      }
    }
    if (plan.warehouseId !== undefined) {
      await stockMoves.update(move.id, { warehouseId: plan.warehouseId });
    }
    recompute.add(move.id);
    productIds.add(move.productId);
    if (move.pickingId !== null) {
      pickingIds.add(move.pickingId);
    }
  }
  const keys = [...touchedKeys];

  if (keys.length > 0) {
    await recomputeReserved(keys);
    const { changedMoveIds } = await cutBackOverReservation(keys);
    changedMoveIds.forEach((id) => recompute.add(id));
  }
  if (reassign.length > 0) {
    await assignMoves(reassign);
  }
  await recomputeMove([...recompute]);
  await recomputePickingState([...pickingIds]);
  await recomputeProductQuantities([...productIds]);

  return refused;
};

export const handleMoveLocations = async (
  events: ObjectRecordEvent<MoveEventRecord>[],
  operation: RecordOperation,
  errors: ErrorCollector,
) => {
  if (operation !== 'updated') {
    return;
  }
  const changes = events.flatMap((event) => {
    const changed = eventChangedFields(event, ['locationId', 'locationDestId']);

    return changed.length === 0 || !isStaffEvent(operation, event)
      ? []
      : [
          {
            moveId: event.recordId,
            sourceChanged: changed.includes('locationId'),
            destinationChanged: changed.includes('locationDestId'),
          },
        ];
  });

  if (changes.length > 0) {
    await errors.run('locations', async () => {
      for (const { moveId, message } of await applyMoveLocationChange(changes)) {
        const event = events.find((candidate) => candidate.recordId === moveId);
        const before = event === undefined ? undefined : eventBefore(event);

        if (event === undefined || before === undefined) {
          continue;
        }
        await putBackForEvent({
          objectSingular: 'stockMove',
          objectPlural: 'stockMoves',
          event,
          data: { locationId: before.locationId, locationDestId: before.locationDestId },
          message,
        });
      }
    });
  }
};
