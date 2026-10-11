import { createMissingRows } from 'src/shared/claims/create-missing-rows';
import { addNote } from 'src/shared/triggers/put-back';
import { derivedId } from 'src/shared/utils/derived-id.util';
import { assignMoves } from 'src/stock/move/actions/assign-moves';
import { graphqlDoneMovesStore } from 'src/stock/move/actions/done-moves-store';
import { unreserveMoves } from 'src/stock/move/actions/unreserve-moves';
import { readLocations } from 'src/stock/location/read-locations';
import { recomputeMove } from 'src/stock/move/recompute-move';
import { planReservationRelease, releaseReservation } from 'src/stock/move-line/free-reservation';
import { type DoneLineCorrectionInput } from 'src/stock/move-line/types/done-line-correction-input.type';
import { type DoneLineStore } from 'src/stock/move-line/types/done-line-store.type';
import { recomputeProductQuantities } from 'src/stock/product/recompute-product-quantities';
import { applyQuantDelta } from 'src/stock/quant/apply-quant-delta';
import { stockLotCompensations } from 'src/stock/lot/lot-records';
import { lotCompensationData } from 'src/stock/lot/lot-compensation-data';
import { recomputeTrackingForKeys } from 'src/stock/lot/recompute-tracking-for-keys';
import { parseQuantKey, quantKey } from 'src/stock/quant/quant-key';
import { recomputeReserved } from 'src/stock/quant/recompute-reserved';
import { stockMoveLines, stockQuants } from 'src/stock/stock-records';
import { nowIso, readStockSettings } from 'src/stock/stock-settings';
import { bypassesReservation } from 'src/stock/utils/location-usage.util';
import { planInDate } from 'src/stock/utils/plan-quant-delta.util';
import { planLotCompensation } from 'src/stock/utils/plan-lot-compensation.util';
import { isZeroAtDigits } from 'src/stock/utils/stock-uom.util';

// Written only while the line still holds the quantity this edit saved: a later edit's event
// owns the stored unit quantity, so two edits arriving in any order end with the last one's.
const writeUnitQuantity = async (store: DoneLineStore, input: DoneLineCorrectionInput) => {
  if ((await store.readLineQuantity(input.lineId)) === input.quantity) {
    await store.writeLine(input.lineId, { quantityProductUom: input.quantityProductUom });
  }
};

// A lot a step of the edit took below zero takes what it lacks from the stock without a lot at the same place, once
// per edit and step: a second delivery of the same edit finds the row and adds nothing. Returns what it moved.
const compensateLot = async (store: DoneLineStore, input: DoneLineCorrectionInput, step: number, key: string, delta: number) => {
  const parts = parseQuantKey(key);

  if (parts.lotId === null) {
    return 0;
  }
  const plan = planLotCompensation({
    key,
    lotAvailable: await store.readAvailable(key),
    noLotFree: await store.readAvailable(quantKey({ ...parts, lotId: null })),
    quantity: delta,
    digits: store.digits(),
  });

  if (plan === null) {
    return 0;
  }
  const created = await store.createLotCompensation({
    id: derivedId('lotCompensation', input.lineId, input.editId, String(step)),
    moveLineId: input.lineId,
    lotKey: key,
    noLotKey: plan.noLotKey,
    quantity: plan.quantity,
    date: store.now(),
  });

  if (created) {
    const removed = await store.applyQuantDelta({ key: plan.noLotKey, delta: -plan.quantity, inDate: null });
    await store.applyQuantDelta({ key, delta: plan.quantity, inDate: removed.inDate });
  }
  return created ? plan.quantity : 0;
};

export const makeDoneLineCorrection = (store: DoneLineStore) => async (input: DoneLineCorrectionInput) => {
  if (input.plan.deltas.length === 0) {
    await writeUnitQuantity(store, input);
    return;
  }
  const inDates = new Map<string, string>();
  // What the step taking the line from its new source made up for that lot: reservations are freed by the shortfall
  // that step left before it was made up.
  let freeKeyCompensation = 0;

  for (const [step, { key, delta, inDateFromKey }] of input.plan.deltas.entries()) {
    if (delta < 0) {
      inDates.set(key, (await store.applyQuantDelta({ key, delta, inDate: null })).inDate);
    } else {
      const inDate =
        inDateFromKey === null ? null : inDates.get(inDateFromKey) ?? (await store.readRemovalInDate(inDateFromKey));
      await store.applyQuantDelta({ key, delta, inDate });
    }
    const compensated = await compensateLot(store, input, step, key, delta);

    if (key === input.plan.freeKey && delta < 0) {
      freeKeyCompensation = compensated;
    }
  }
  await store.recomputeTrackingForKeys([...new Set(input.plan.deltas.map(({ key }) => key))]);

  if (input.plan.freeKey !== null) {
    await store.recomputeReserved([input.plan.freeKey]);
    const available = (await store.readAvailable(input.plan.freeKey)) - freeKeyCompensation;

    if (available < 0 && !isZeroAtDigits(available, store.digits())) {
      const release = await store.planReservationRelease({
        key: input.plan.freeKey,
        shortfall: -available,
        pickingId: input.pickingId,
        ignoreLineIds: [input.lineId],
      });
      await store.releaseReservation(input.plan.freeKey, release);
    }
  }

  if (input.moveId !== null) {
    const destinationIds = await store.readOpenDestinationMoveIds([input.moveId]);

    if (destinationIds.length > 0) {
      await store.unreserveMoves(destinationIds);
      await store.assignMoves(destinationIds);
    }
  }
  await writeUnitQuantity(store, input);
  if (input.moveId !== null) {
    await store.recomputeMove([input.moveId]);
  }
  if (input.pickingId !== null && input.note !== null) {
    await store.addPickingNote(input.pickingId, input.note);
  }
  await store.recomputeProductQuantities(input.productIds);
};

const graphqlDoneLineStore: DoneLineStore = {
  applyQuantDelta: (args) => applyQuantDelta(args),
  readRemovalInDate: async (key) => {
    const { locationId } = parseQuantKey(key);
    const [[quant], location] = await Promise.all([
      stockQuants.find<{ quantity: number; inDate: string | null }>({ quantKey: { eq: key } }, 'quantity inDate'),
      readLocations([locationId]),
    ]);

    return planInDate({
      existing: quant ?? null,
      incomingInDate: null,
      bypassesReservation: bypassesReservation(location.get(locationId)?.usage ?? 'INTERNAL'),
      now: nowIso(),
      digits: readStockSettings().productUnitDigits,
    });
  },
  readLineQuantity: async (lineId) =>
    (await stockMoveLines.find<{ quantity: number }>({ id: { eq: lineId } }, 'quantity'))[0]?.quantity ?? null,
  readAvailable: graphqlDoneMovesStore.readAvailable,
  createLotCompensation: async (row) =>
    (await createMissingRows(stockLotCompensations, [{ id: row.id, data: lotCompensationData(row) }])).length > 0,
  recomputeReserved,
  planReservationRelease,
  releaseReservation,
  readOpenDestinationMoveIds: graphqlDoneMovesStore.readOpenDestinationMoveIds,
  unreserveMoves,
  assignMoves,
  recomputeMove,
  recomputeProductQuantities,
  recomputeTrackingForKeys,
  writeLine: (lineId, data) => stockMoveLines.update(lineId, data),
  addPickingNote: (pickingId, text) =>
    addNote({ objectSingular: 'stockPicking', recordId: pickingId, title: text.split('\n')[0], body: text }),
  now: nowIso,
  digits: () => readStockSettings().productUnitDigits,
};

export const applyDoneLineCorrection = makeDoneLineCorrection(graphqlDoneLineStore);
