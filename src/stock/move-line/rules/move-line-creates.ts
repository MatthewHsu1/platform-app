import { createHash } from 'node:crypto';

import { type ObjectRecordEvent } from 'twenty-sdk/define';

import { createMissingRows } from 'src/shared/claims/create-missing-rows';
import { isApplicationWrite } from 'src/shared/triggers/actor';
import { type RecordOperation } from 'src/shared/triggers/batch-events';
import { addNote } from 'src/shared/triggers/put-back';
import { type ErrorCollector } from 'src/shared/triggers/retry-on-conflict';
import { uuidFromBytes } from 'src/shared/utils/uuid-from-bytes.util';
import { readLocations } from 'src/stock/location/read-locations';
import { assignMoves } from 'src/stock/move/actions/assign-moves';
import { graphqlDoneMovesStore } from 'src/stock/move/actions/done-moves-store';
import { unreserveMoves } from 'src/stock/move/actions/unreserve-moves';
import { recomputeTrackingForKeys } from 'src/stock/lot/recompute-tracking-for-keys';
import { recomputeAfterLineChanges } from 'src/stock/move-line/rules/recompute-after-line-changes';
import { type MoveLineEventRecord } from 'src/stock/move-line/types/move-line-event-record.type';
import { copyPickingReferences } from 'src/stock/move/rules/move-picking';
import { readStockProducts } from 'src/stock/product/read-stock-products';
import { applyQuantDelta } from 'src/stock/quant/apply-quant-delta';
import { destinationKeyOf, sourceKeyOf } from 'src/stock/quant/quant-key';
import { eventAfter } from 'src/stock/stock-event-helpers';
import { MOVE_STATE } from 'src/stock/stock-options.constant';
import { stockMoveLines, stockMoves, stockPickings } from 'src/stock/stock-records';
import { MOVE_LINE_ROW, MOVE_ROW, PICKING_ROW } from 'src/stock/stock-rows';
import { readStockSettings } from 'src/stock/stock-settings';
import { readResolvedUoms } from 'src/stock/stock-uoms';
import { planMoveCreate } from 'src/stock/utils/plan-move-rules.util';
import { planMoveLineCreate } from 'src/stock/utils/plan-move-line-create.util';
import { type LocationUsage } from 'src/stock/types/location-usage.type';
import { type MoveLineRow } from 'src/stock/types/move-line-row.type';
import { type MoveRow } from 'src/stock/types/move-row.type';
import { type PickingRow } from 'src/stock/types/picking-row.type';

// The move made for a line has an id that depends only on the line, so a retried batch finds it instead of making a second.
const moveIdForLine = (lineId: string) => uuidFromBytes(createHash('sha1').update(`stock-move-line-move:${lineId}`).digest(), 5);

const postDoneLine = async (line: MoveLineRow, quantityProductUom: number, moveId: string) => {
  const removed = await applyQuantDelta({ key: sourceKeyOf(line), delta: -quantityProductUom, inDate: null });

  await applyQuantDelta({ key: destinationKeyOf(line), delta: quantityProductUom, inDate: removed.inDate });
  await recomputeTrackingForKeys([sourceKeyOf(line), destinationKeyOf(line)]);

  const open = await graphqlDoneMovesStore.readOpenDestinationMoveIds([moveId]);

  if (open.length > 0) {
    await unreserveMoves(open);
    await assignMoves(open);
  }
};

// The move a user's line needs when the transfer has none for the product takes the values a move made by hand gets.
const completeNewMove = (
  newMove: Record<string, unknown>,
  picking: PickingRow,
  productUomId: string,
  locations: Awaited<ReturnType<typeof readLocations>>,
) => {
  const { data } = planMoveCreate({
    move: {
      productUomId: newMove.productUomId as string,
      packagingUomId: null,
      pickingTypeId: newMove.pickingTypeId as string | null,
      priority: picking.priority,
      companyId: newMove.companyId as string | null,
      personId: newMove.personId as string | null,
      locationId: newMove.locationId as string | null,
      locationDestId: newMove.locationDestId as string | null,
      locationFinalId: null,
      warehouseId: null,
      state: newMove.state as MoveRow['state'],
      picked: newMove.picked as boolean,
      additional: false,
    },
    picking,
    pickingType: null,
    productUomId,
    locations,
  });

  return { ...newMove, ...data };
};

// A line a user makes gets its move, unit, locations, picked flag, state and name; an open line's reservation is
// recomputed with the over-reservation cut-back; a line made on a done move is posted at once. Posting never throws:
// a failed key is reported on a note and the nightly check repairs it. A line already marked done is not posted
// again, so a retried batch cannot post twice.
export const handleMoveLineCreates = async (
  events: ObjectRecordEvent<MoveLineEventRecord>[],
  operation: RecordOperation,
  errors: ErrorCollector,
) => {
  if (operation !== 'created') {
    return;
  }
  const lineIds = events.filter((event) => !isApplicationWrite(eventAfter(event))).map((event) => event.recordId);

  if (lineIds.length === 0) {
    return;
  }

  const lines = await stockMoveLines.find<MoveLineRow>({ id: { in: lineIds } }, MOVE_LINE_ROW);
  const moveIds = lines.flatMap((line) => (line.moveId === null ? [] : [line.moveId]));
  const pickingIds = [...new Set(lines.flatMap((line) => (line.pickingId === null ? [] : [line.pickingId])))];
  const moveConditions = [
    ...(moveIds.length > 0 ? [{ id: { in: moveIds } }] : []),
    ...(pickingIds.length > 0 ? [{ pickingId: { in: pickingIds } }] : []),
  ];
  const moves = moveConditions.length === 0 ? [] : await stockMoves.find<MoveRow>({ or: moveConditions }, MOVE_ROW);
  const pickings = pickingIds.length === 0 ? [] : await stockPickings.find<PickingRow>({ id: { in: pickingIds } }, PICKING_ROW);
  const products = await readStockProducts(lines.map((line) => line.productId));
  const uoms = await readResolvedUoms();
  const locations = await readLocations(
    [
      ...lines.flatMap((line) => [line.locationId, line.locationDestId]),
      ...moves.flatMap((move) => [move.locationId, move.locationDestId]),
      ...pickings.flatMap((picking) => [picking.locationId, picking.locationDestId]),
    ].flatMap((id) => (id === null ? [] : [id])),
  );
  const locationUsages = new Map<string, LocationUsage>([...locations.values()].map((location) => [location.id, location.usage]));
  const { productUnitDigits } = readStockSettings();
  const touchedKeys = new Set<string>();
  const touchedMoveIds = new Set<string>();

  for (const line of lines) {
    await errors.run(line.id, async () => {
      const product = products.get(line.productId);

      if (product === undefined) {
        return;
      }
      const move = moves.find((candidate) => candidate.id === line.moveId) ?? null;
      const picking = pickings.find((candidate) => candidate.id === line.pickingId) ?? null;
      const withQuantities = (candidate: MoveRow) => ({
        ...candidate,
        quantity: candidate.quantity ?? 0,
        productQty: candidate.productQty ?? 0,
      });
      const plan = planMoveLineCreate({
        line,
        move: move === null ? null : withQuantities(move),
        picking,
        pickingMoves: moves
          .filter((candidate) => picking !== null && candidate.pickingId === picking.id)
          .map(withQuantities),
        product: {
          productId: product.productId,
          uomId: product.uomId,
          isStorable: product.isStorable,
          displayName: product.displayName,
        },
        uoms,
        locationUsages,
        digits: productUnitDigits,
        newMoveId: moveIdForLine(line.id),
      });

      if (plan.newMove !== null && picking !== null) {
        await createMissingRows(stockMoves, [
          { id: plan.newMove.id as string, data: completeNewMove(plan.newMove, picking, product.uomId, locations) },
        ]);
        await copyPickingReferences([plan.newMove.id as string]);
      }
      await stockMoveLines.update(line.id, plan.lineData);
      const written = { ...line, ...plan.lineData } as MoveLineRow;

      if (plan.moveId !== null) {
        touchedMoveIds.add(plan.moveId);
      }
      if (plan.reservationNeeded) {
        touchedKeys.add(sourceKeyOf(written));
      }
      if (plan.applyDone && plan.moveId !== null && line.state !== MOVE_STATE.DONE) {
        try {
          await postDoneLine(written, written.quantityProductUom ?? 0, plan.moveId);
        } catch (error) {
          await addNote({
            objectSingular: written.pickingId === null ? 'stockMove' : 'stockPicking',
            recordId: written.pickingId ?? plan.moveId,
            title: 'Stock level not updated',
            body: `The line ${written.name ?? written.id} is done but its stock levels could not be updated (${error instanceof Error ? error.message : String(error)}). The nightly stock check repairs them.`,
          });
        }
      }
    });
  }

  await errors.run('reservations', () =>
    recomputeAfterLineChanges({
      keys: [...touchedKeys],
      moveIds: [...touchedMoveIds],
      productIds: lines.map((line) => line.productId),
    }),
  );
};
