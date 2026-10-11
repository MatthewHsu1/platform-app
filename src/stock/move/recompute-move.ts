import { type Records } from 'src/shared/triggers/records';
import { readLocations } from 'src/stock/location/read-locations';
import { readStockProducts } from 'src/stock/product/read-stock-products';
import {
  stockMoveLines,
  stockMoveMoveRels,
  stockMoves,
  stockPickings,
  stockPickingTypes,
  stockScraps,
} from 'src/stock/stock-records';
import { MOVE_LINE_ROW, MOVE_MOVE_REL_ROW, MOVE_ROW, PICKING_TYPE_ROW } from 'src/stock/stock-rows';
import { readStockSettings } from 'src/stock/stock-settings';
import { readResolvedUoms } from 'src/stock/stock-uoms';
import { changedFields } from 'src/stock/utils/changed-fields.util';
import { planMoveState } from 'src/stock/utils/plan-move-state.util';
import { planLineValues, planMoveValues } from 'src/stock/utils/plan-move-values.util';
import { type MoveLineRow } from 'src/stock/types/move-line-row.type';
import { type MoveMoveRelRow } from 'src/stock/types/move-move-rel-row.type';
import { type MoveRow } from 'src/stock/types/move-row.type';
import { type MoveState } from 'src/stock/types/move-state.type';
import { type PickingTypeRow } from 'src/stock/types/picking-type-row.type';

type OriginMove = { id: string; state: MoveState; date: string | null; productUomQty: number };

const idsOf = (values: (string | null)[]) => [...new Set(values.flatMap((value) => (value === null ? [] : [value])))];

// A move often has no transfer, type, scrap or original move: skip the query then.
const findByIds = async <TRow>(of: Records, ids: string[], selection: string): Promise<TRow[]> =>
  ids.length === 0 ? [] : of.find<TRow>({ id: { in: ids } }, selection);

// The one writer of a move's derived values (quantity, picked, live state,
// real quantity, reservation and delay dates, reference, name, description,
// packaging quantity) and of its lines' copies (state, quantity in the
// product unit, name). It writes only what changed.
export const recomputeMove = async (moveIds: string[]) => {
  const ids = [...new Set(moveIds)];

  if (ids.length === 0) {
    return;
  }

  // The move is read before its lines: Validate marks lines picked before
  // moves, so a run that sees a picked move never sees its lines unpicked.
  const moves = await stockMoves.find<MoveRow>({ id: { in: ids } }, MOVE_ROW);
  const [lines, links, pickings, pickingTypes, scraps, products, uoms] = await Promise.all([
    stockMoveLines.find<MoveLineRow>({ moveId: { in: ids } }, MOVE_LINE_ROW),
    stockMoveMoveRels.find<MoveMoveRelRow>({ moveDestId: { in: ids } }, MOVE_MOVE_REL_ROW),
    findByIds<{ id: string; name: string | null; origin: string | null }>(
      stockPickings,
      idsOf(moves.map((move) => move.pickingId)),
      'id name origin',
    ),
    findByIds<PickingTypeRow>(stockPickingTypes, idsOf(moves.map((move) => move.pickingTypeId)), PICKING_TYPE_ROW),
    findByIds<{ id: string; name: string | null }>(stockScraps, idsOf(moves.map((move) => move.scrapId)), 'id name'),
    readStockProducts(moves.map((move) => move.productId)),
    readResolvedUoms(),
  ]);
  const [originMoves, locations] = await Promise.all([
    findByIds<OriginMove>(stockMoves, idsOf(links.map((link) => link.moveOrigId)), 'id state date productUomQty'),
    readLocations(idsOf(moves.flatMap((move) => [move.locationId, move.locationDestId]))),
  ]);
  const digits = readStockSettings().productUnitDigits;

  for (const move of moves) {
    const product = products.get(move.productId);

    if (product === undefined) {
      continue;
    }

    const moveLines = lines.filter((line) => line.moveId === move.id);
    const origins = links
      .filter((link) => link.moveDestId === move.id)
      .flatMap((link) => originMoves.filter((origin) => origin.id === link.moveOrigId));
    const pickingType = pickingTypes.find((type) => type.id === move.pickingTypeId) ?? null;
    const picking = pickings.find((candidate) => candidate.id === move.pickingId) ?? null;
    const values = planMoveValues({
      move: {
        state: move.state,
        date: move.date,
        productUomQty: move.productUomQty,
        priority: move.priority,
        isInventory: move.isInventory,
        inventoryName: move.inventoryName,
        picked: move.picked,
        descriptionPickingManual: move.descriptionPickingManual,
        productUomId: move.productUomId,
        packagingUomId: move.packagingUomId,
        reservationDate: move.reservationDate,
      },
      lines: moveLines.map((line) => ({ quantity: line.quantity, productUomId: line.productUomId, picked: line.picked })),
      product,
      pickingType,
      picking,
      scrapName: scraps.find((scrap) => scrap.id === move.scrapId)?.name ?? null,
      originMoves: origins,
      sourceName: move.locationId === null ? null : (locations.get(move.locationId)?.name ?? null),
      destinationName: move.locationDestId === null ? null : (locations.get(move.locationDestId)?.name ?? null),
      uoms,
      digits,
    });
    const state =
      planMoveState(
        {
          state: move.state,
          quantity: values.quantity,
          productUomQty: move.productUomQty,
          procureMethod: move.procureMethod,
          originMoves: origins,
        },
        digits,
      ) ?? move.state;

    await stockMoves.update(move.id, changedFields(move, { ...values, state }));

    for (const line of moveLines) {
      const lineValues = planLineValues({
        quantity: line.quantity,
        lineUomId: line.productUomId,
        productUomId: product.uomId,
        reference: values.reference,
        productName: product.displayName,
        uoms,
        digits,
      });

      await stockMoveLines.update(line.id, changedFields(line, { ...lineValues, state }));
    }
  }
};
