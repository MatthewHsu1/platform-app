import { graphqlDoneMovesStore } from 'src/stock/move/actions/done-moves-store';
import { MOVE_STATE } from 'src/stock/stock-options.constant';
import { planSplitMove } from 'src/stock/utils/plan-split-move.util';
import { compareAtDigits, convertQuantity } from 'src/stock/utils/stock-uom.util';
import { type ClaimJournal } from 'src/shared/claims/types/claim-journal.type';
import { type SplitMoveCreate } from 'src/stock/move/types/split-move-create.type';
import { type SplitMovesStore } from 'src/stock/move/types/split-moves-store.type';

type SplitPlan = { moveId: string; originalDemand: number; create: SplitMoveCreate }[];

// Each live move whose lines hold less than its demand gets a new move for the rest
// (confirmed, without merge or procurement); the move keeps what its lines hold.
export const makeSplitMoves =
  (store: SplitMovesStore) =>
  async (moveIds: string[], journal: ClaimJournal, stepName: string): Promise<string[]> => {
    const plan = await journal.step<SplitPlan>(
      stepName,
      async () => {
        if (moveIds.length === 0) {
          return [];
        }
        const digits = store.digits();
        const uoms = await store.uoms();

        return (await store.readMoves(moveIds)).flatMap((move) => {
          if (move.state === MOVE_STATE.DONE || move.state === MOVE_STATE.CANCEL || move.state === MOVE_STATE.DRAFT) {
            return [];
          }
          const quantity = move.lines.reduce(
            (sum, line) =>
              sum + convertQuantity({ qty: line.quantity, fromUomId: line.productUomId, toUomId: move.productUomId, uoms, digits, round: false }),
            0,
          );

          if (compareAtDigits(quantity, move.productUomQty, digits) >= 0) {
            return [];
          }
          const split = planSplitMove({
            productQty: move.productQty,
            quantity: convertQuantity({
              qty: move.productUomQty - quantity,
              fromUomId: move.productUomId,
              toUomId: move.productUnitUomId,
              uoms,
              digits,
              method: 'HALF-UP',
            }),
            moveUomId: move.productUomId,
            productUomId: move.productUnitUomId,
            uoms,
            digits,
          });

          return split === null
            ? []
            : [
                {
                  moveId: move.id,
                  originalDemand: split.originalDemand,
                  create: {
                    id: store.newId(),
                    values: { ...move.copyValues, productUomQty: split.newDemand, productUomId: split.newUomId },
                    moveOrigIds: move.moveOrigIds,
                    moveDestIds: move.openMoveDestIds,
                    referenceIds: move.referenceIds,
                  },
                },
              ];
        });
      },
      async (stored) => {
        if (stored.length === 0) {
          return;
        }
        await store.createSplitMoves(stored.map((row) => row.create));
        await store.confirmMoves(
          stored.map((row) => row.create.id),
          { merge: false, createProcurement: false },
        );
        await store.updateMoves(stored.map((row) => ({ id: row.moveId, data: { productUomQty: row.originalDemand } })));
        await store.recomputeMove(stored.map((row) => row.moveId));
      },
    );

    return plan.map((row) => row.create.id);
  };

export const splitMoves = makeSplitMoves(graphqlDoneMovesStore);
