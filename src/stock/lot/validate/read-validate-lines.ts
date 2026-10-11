import { distinctIds as ids } from 'src/shared/utils/distinct-ids.util';
import { readLocations } from 'src/stock/location/read-locations';
import { readStockProducts } from 'src/stock/product/read-stock-products';
import { LOCATION_USAGE, PRODUCT_TRACKING } from 'src/stock/stock-options.constant';
import { stockMoveLines, stockMoves, stockPickings, stockPickingTypes } from 'src/stock/stock-records';
import { MOVE_LINE_ROW, MOVE_ROW } from 'src/stock/stock-rows';
import { type ValidateLineRow } from 'src/stock/lot/types/validate-line-row.type';
import { type MoveLineRow } from 'src/stock/types/move-line-row.type';
import { type MoveRow } from 'src/stock/types/move-row.type';
import { type ValidateMove } from 'src/stock/utils/types/validate-move.type';

type LineRead = MoveLineRow & { lotName: string | null; expirationDate: string | null };
type PickingRead = { id: string; name: string | null; pickingTypeId: string | null };
type TypeRead = { id: string; useCreateLots: boolean | null; useExistingLots: boolean | null };

// The lines Validate looks at for lots, with what their move, transfer, operation type and product say.
const readLines = async (
  filter: Record<string, unknown>,
  moveFilter: (lines: LineRead[]) => Record<string, unknown>,
): Promise<{ lines: ValidateLineRow[]; moves: ValidateMove[] }> => {
  const lines = await stockMoveLines.find<LineRead>(filter, `${MOVE_LINE_ROW} lotName expirationDate`);

  if (lines.length === 0) {
    return { lines: [], moves: [] };
  }
  const [moves, pickings, products] = await Promise.all([
    stockMoves.find<MoveRow>(moveFilter(lines), MOVE_ROW),
    stockPickings.find<PickingRead>({ id: { in: ids(lines.map((line) => line.pickingId)) } }, 'id name pickingTypeId'),
    readStockProducts(lines.map((line) => line.productId)),
  ]);
  const [types, locations] = await Promise.all([
    stockPickingTypes.find<TypeRead>(
      { id: { in: ids([...moves.map((move) => move.pickingTypeId), ...pickings.map((picking) => picking.pickingTypeId)]) } },
      'id useCreateLots useExistingLots',
    ),
    readLocations(ids(moves.map((move) => move.locationDestId))),
  ]);
  const moveById = new Map(moves.map((move) => [move.id, move]));
  const pickingById = new Map(pickings.map((picking) => [picking.id, picking]));
  const typeById = new Map(types.map((type) => [type.id, type]));
  const usesLots = (typeId: string | null | undefined) => {
    const type = typeById.get(typeId ?? '');
    return type?.useCreateLots === true || type?.useExistingLots === true;
  };

  return {
    lines: lines.map((line) => {
      const move = moveById.get(line.moveId ?? '');
      const picking = pickingById.get(line.pickingId ?? '');
      const product = products.get(line.productId);
      const moveType = move?.pickingTypeId === null || move === undefined ? undefined : typeById.get(move.pickingTypeId);

      return {
        id: line.id,
        pickingId: line.pickingId,
        pickingName: picking?.name ?? '',
        pickingUsesLots: usesLots(picking?.pickingTypeId),
        moveId: line.moveId,
        productId: line.productId,
        productName: product?.displayName ?? '',
        tracking: product?.tracking ?? PRODUCT_TRACKING.NONE,
        quantity: line.quantity,
        productUomId: line.productUomId ?? move?.productUomId ?? product?.uomId ?? '',
        quantityProductUom: line.quantityProductUom ?? line.quantity,
        picked: line.picked,
        movePicked: move?.picked === true,
        moveState: move?.state ?? line.state,
        isInventory: move?.isInventory === true,
        isScrap: (move?.scrapId ?? null) !== null,
        hasPickingType: (move?.pickingTypeId ?? null) !== null,
        useCreateLots: moveType?.useCreateLots === true,
        useExistingLots: moveType?.useExistingLots === true,
        lotId: line.lotId,
        lotName: line.lotName,
        expirationDate: line.expirationDate,
        locationId: line.locationId ?? move?.locationId ?? '',
        locationDestId: line.locationDestId ?? move?.locationDestId ?? '',
        moveLocationDestId: move?.locationDestId ?? line.locationDestId ?? '',
        state: line.state,
        packageId: line.packageId,
        resultPackageId: line.resultPackageId,
      };
    }),
    moves: moves.map((move) => ({
      id: move.id,
      pickingId: move.pickingId,
      state: move.state,
      quantity: move.quantity ?? 0,
      productUomQty: move.productUomQty,
      picked: move.picked,
      toInventory: locations.get(move.locationDestId ?? '')?.usage === LOCATION_USAGE.INVENTORY,
      isInventory: move.isInventory,
      productUomId: move.productUomId ?? products.get(move.productId)?.uomId ?? '',
    })),
  };
};

// Every move of the transfers is read: a picked move without lines still decides which lines Validate keeps.
export const readValidateLines = (pickingIds: string[]) =>
  readLines({ pickingId: { in: pickingIds } }, () => ({ pickingId: { in: pickingIds } }));

export const readValidateLinesById = async (lineIds: string[]) =>
  (await readLines({ id: { in: lineIds } }, (lines) => ({ id: { in: ids(lines.map((line) => line.moveId)) } }))).lines;
