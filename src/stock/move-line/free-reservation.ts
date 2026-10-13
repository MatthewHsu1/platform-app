import { readLocations } from 'src/stock/location/read-locations';
import { assignMoves } from 'src/stock/move/actions/assign-moves';
import { readMoveLinks, unlinkMoves } from 'src/stock/move/move-links';
import { recomputeMove } from 'src/stock/move/recompute-move';
import { readStockProducts } from 'src/stock/product/read-stock-products';
import { lineFilterForKey, parseQuantKey } from 'src/stock/quant/quant-key';
import { recomputeReserved } from 'src/stock/quant/recompute-reserved';
import { OPEN_LINE_STATES, PROCURE_METHOD } from 'src/stock/stock-options.constant';
import { stockMoveLines, stockMoves, stockPickings } from 'src/stock/stock-records';
import { MOVE_LINE_ROW } from 'src/stock/stock-rows';
import { readStockSettings } from 'src/stock/stock-settings';
import { readResolvedUoms } from 'src/stock/stock-uoms';
import { bypassesReservation } from 'src/stock/utils/location-usage.util';
import { planFreeReservation } from 'src/stock/utils/plan-free-reservation.util';
import { convertQuantity } from 'src/stock/utils/stock-uom.util';
import { type FreeReservationStore } from 'src/stock/move-line/types/free-reservation-store.type';
import { type MoveLineRow } from 'src/stock/types/move-line-row.type';
import { type FreeReservationPlan } from 'src/stock/utils/types/free-reservation-plan.type';

type FreeReservationArgs = { key: string; shortfall: number; pickingId: string | null; ignoreLineIds: string[] };

const NOTHING_TO_FREE: FreeReservationPlan = { destroy: [], shrink: [], movesToReassign: [] };

// Planned apart from its writes, so a run that stores the plan can replay the writes after a
// stop: once the first line is gone, the shortfall that called for them is gone too.
export const makeReservationRelease = (store: FreeReservationStore) => {
  const plan = async ({ key, shortfall, pickingId, ignoreLineIds }: FreeReservationArgs): Promise<FreeReservationPlan> =>
    (await store.bypassesReservation(key))
      ? NOTHING_TO_FREE
      : planFreeReservation({ shortfall, pickingId, candidates: await store.readCandidates(key, ignoreLineIds), digits: store.digits() });

  // The freed moves get their state back from their remaining lines first, so Check
  // Availability sees them as waiting again.
  const apply = async (key: string, release: FreeReservationPlan) => {
    if (release.destroy.length === 0 && release.shrink.length === 0) {
      return;
    }
    await store.makeMovesToStock(release.movesToReassign);
    if (release.destroy.length > 0) {
      await store.destroyLines(release.destroy);
    }
    for (const shrink of release.shrink) {
      await store.shrinkLine(shrink.lineId, shrink.quantityProductUom);
    }
    await store.recomputeReserved([key]);
    await store.recomputeMove(release.movesToReassign);
    await store.assignMoves(release.movesToReassign);
  };

  return { plan, apply };
};

export const makeFreeReservation = (store: FreeReservationStore) => {
  const release = makeReservationRelease(store);

  return async (args: FreeReservationArgs) => release.apply(args.key, await release.plan(args));
};

const graphqlFreeReservationStore: FreeReservationStore = {
  bypassesReservation: async (key) => {
    const { locationId } = parseQuantKey(key);
    const location = (await readLocations([locationId])).get(locationId);
    return location === undefined || bypassesReservation(location.usage);
  },
  readCandidates: async (key, ignoreLineIds) => {
    const lines = (
      await stockMoveLines.find<MoveLineRow>(
        {
          ...lineFilterForKey(key, 'source'),
          state: { in: OPEN_LINE_STATES },
          picked: { eq: false },
        },
        MOVE_LINE_ROW,
      )
    ).filter((line) => (line.quantityProductUom ?? line.quantity) > 0 && !ignoreLineIds.includes(line.id));
    const moveIds = [...new Set(lines.flatMap((line) => (line.moveId === null ? [] : [line.moveId])))];
    const pickingIds = [...new Set(lines.flatMap((line) => (line.pickingId === null ? [] : [line.pickingId])))];
    const [moves, pickings] = await Promise.all([
      moveIds.length === 0 ? [] : stockMoves.find<{ id: string; date: string | null }>({ id: { in: moveIds } }, 'id date'),
      pickingIds.length === 0
        ? []
        : stockPickings.find<{ id: string; scheduledDate: string | null }>({ id: { in: pickingIds } }, 'id scheduledDate'),
    ]);
    const moveDate = new Map(moves.map((move) => [move.id, move.date]));
    const scheduledDate = new Map(pickings.map((row) => [row.id, row.scheduledDate]));

    return lines.map((line) => ({
      lineId: line.id,
      moveId: line.moveId,
      pickingId: line.pickingId,
      scheduledDate: (line.pickingId === null ? null : scheduledDate.get(line.pickingId)) ?? moveDate.get(line.moveId ?? '') ?? null,
      createdAt: line.createdAt,
      quantityProductUom: line.quantityProductUom ?? line.quantity,
    }));
  },
  destroyLines: async (lineIds) => {
    await stockMoveLines.destroyMany(lineIds);
  },
  shrinkLine: async (lineId, quantityProductUom) => {
    const [line] = await stockMoveLines.find<MoveLineRow>({ id: { eq: lineId } }, MOVE_LINE_ROW);

    if (line === undefined) {
      return;
    }
    const product = (await readStockProducts([line.productId])).get(line.productId);
    const productUomId = product?.uomId ?? line.productUomId ?? '';
    await stockMoveLines.update(lineId, {
      quantityProductUom,
      quantity: convertQuantity({
        qty: quantityProductUom,
        fromUomId: productUomId,
        toUomId: line.productUomId ?? productUomId,
        uoms: await readResolvedUoms(),
        digits: readStockSettings().productUnitDigits,
        method: 'HALF-UP',
      }),
    });
  },
  makeMovesToStock: async (moveIds) => {
    if (moveIds.length === 0) {
      return;
    }
    await stockMoves.updateMany(moveIds, { procureMethod: PROCURE_METHOD.MAKE_TO_STOCK });
    const links = await readMoveLinks(moveIds);
    await unlinkMoves(moveIds.flatMap((moveId) => (links.origsOf.get(moveId) ?? []).map((moveOrigId) => ({ moveOrigId, moveDestId: moveId }))));
  },
  recomputeReserved,
  recomputeMove,
  assignMoves,
  digits: () => readStockSettings().productUnitDigits,
};

export const freeReservation = makeFreeReservation(graphqlFreeReservationStore);
export const { plan: planReservationRelease, apply: releaseReservation } = makeReservationRelease(graphqlFreeReservationStore);
