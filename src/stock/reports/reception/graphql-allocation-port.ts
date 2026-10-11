import {
  heldClaimKeys,
  openJournal,
  releaseClaims,
  settleOwnedClaim,
  takeClaims,
  withClaim,
} from 'src/shared/claims/claim';
import { createMissingRows } from 'src/shared/claims/create-missing-rows';
import { readInChunks } from 'src/shared/utils/read-in-chunks.util';
import { assignMoves } from 'src/stock/move/actions/assign-moves';
import { applyMoveSplit, planMoveSplit } from 'src/stock/move/actions/split-move';
import { unreserveMoves } from 'src/stock/move/actions/unreserve-moves';
import { linkMoves, readMoveReferences, unlinkMoves } from 'src/stock/move/move-links';
import { recomputeMove } from 'src/stock/move/recompute-move';
import { recomputePickingState } from 'src/stock/picking/recompute-picking-state';
import { readStockProducts } from 'src/stock/product/read-stock-products';
import { sourceKeyOf } from 'src/stock/quant/quant-key';
import { recomputeReserved } from 'src/stock/quant/recompute-reserved';
import { readAllocationInputs, readMovePickingIds } from 'src/stock/reports/reception/read-reception-data';
import { type AllocationPort } from 'src/stock/reports/reception/types/allocation-port.type';
import { stockMoveLines, stockMoves, stockReferenceMoveRels } from 'src/stock/stock-records';
import { MOVE_LINE_ROW } from 'src/stock/stock-rows';
import { readStockSettings } from 'src/stock/stock-settings';
import { readResolvedUoms } from 'src/stock/stock-uoms';
import { type MoveLineRow } from 'src/stock/types/move-line-row.type';
import { type MoveState } from 'src/stock/types/move-state.type';

const distinct = (ids: string[]) => [...new Set(ids)];

// A copy keeps everything that says where the goods are and what holds them;
// only its move and quantity differ.
const LINE_COPY_FIELDS = [
  'name',
  'pickingId',
  'productId',
  'productUomId',
  'picked',
  'date',
  'ownerId',
  'lotId',
  'packageId',
  'resultPackageId',
  'locationId',
  'locationDestId',
  'state',
] as const;

// Written as the app; the route has checked the user can read every move asked for.
export const graphqlAllocationPort: AllocationPort = {
  claims: { withClaim, openJournal, takeClaims, releaseClaims, settleOwnedClaim, heldClaimKeys },
  digits: () => readStockSettings().productUnitDigits,
  uoms: readResolvedUoms,
  readMovePickingIds,
  readInputs: readAllocationInputs,
  readMoveStates: async (moveIds) =>
    new Map(
      (await readInChunks(moveIds, (part) => stockMoves.find<{ id: string; state: MoveState }>({ id: { in: part } }, 'id state'))).map(
        (move) => [move.id, move.state],
      ),
    ),
  readLineStates: async (lineIds) =>
    new Map(
      (
        await readInChunks([...new Set(lineIds)], (part) =>
          stockMoveLines.find<{ id: string; state: MoveState }>({ id: { in: part } }, 'id state'),
        )
      ).map((line) => [line.id, line.state]),
    ),
  planMoveSplit: (moveId, quantity, target) => planMoveSplit(moveId, quantity, target),
  applyMoveSplit,
  writeLines: async (writes) => {
    for (const write of writes) {
      if (write.kind === 'move') {
        await stockMoveLines.update(write.lineId, { moveId: write.moveId });
        continue;
      }
      const [line] = await stockMoveLines.find<MoveLineRow>({ id: { eq: write.lineId } }, MOVE_LINE_ROW);

      await stockMoveLines.update(write.lineId, { quantity: write.quantity, moveId: write.moveId });
      if (line !== undefined) {
        await createMissingRows(stockMoveLines, [
          {
            id: write.copyId,
            data: {
              ...Object.fromEntries(LINE_COPY_FIELDS.map((field) => [field, line[field]])),
              moveId: write.copyMoveId,
              quantity: write.copyQuantity,
            },
          },
        ]);
      }
    }
  },
  linkMoves,
  unlinkMoves,
  setProcureMethod: (moveIds, procureMethod) => stockMoves.updateMany(moveIds, { procureMethod }),
  // A reference added to a transfer goes on every move of it.
  addReferences: async (pickingId, referenceIds) => {
    const moves = await stockMoves.find<{ id: string }>({ pickingId: { eq: pickingId } }, 'id');
    const existing = await readMoveReferences(moves.map((move) => move.id));
    const missing = moves.flatMap((move) =>
      referenceIds
        .filter((referenceId) => !(existing.get(move.id) ?? []).includes(referenceId))
        .map((referenceId) => ({ moveId: move.id, referenceId })),
    );

    if (missing.length > 0) {
      await stockReferenceMoveRels.createMany(missing);
    }
  },
  removeReferences: async (pickingId, referenceIds) => {
    const moves = await stockMoves.find<{ id: string }>({ pickingId: { eq: pickingId } }, 'id');
    const links = await stockReferenceMoveRels.find<{ id: string }>(
      { moveId: { in: moves.map((move) => move.id) }, referenceId: { in: referenceIds } },
      'id',
    );

    await stockReferenceMoveRels.destroyMany(links.map((link) => link.id));
  },
  recompute: async (moveIds, lineIds) => {
    await recomputeMove(moveIds);
    const lines = await stockMoveLines.find<MoveLineRow>({ id: { in: lineIds } }, MOVE_LINE_ROW);
    const products = await readStockProducts(lines.map((line) => line.productId));

    await recomputeReserved(
      distinct(lines.filter((line) => products.get(line.productId)?.isStorable === true).map((line) => sourceKeyOf(line))),
    );
    const moves = await stockMoves.find<{ pickingId: string | null }>({ id: { in: moveIds } }, 'pickingId');

    await recomputePickingState(distinct(moves.flatMap((move) => (move.pickingId === null ? [] : [move.pickingId]))));
  },
  assignMoves,
  unreserveMoves,
};
