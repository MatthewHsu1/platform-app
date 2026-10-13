import { PROCURE_METHOD } from 'src/stock/stock-options.constant';
import { type NegativeMovePlan } from 'src/stock/utils/types/negative-move-plan.type';

type NegativeMove = {
  id: string;
  productUomQty: number;
  locationId: string | null;
  locationDestId: string | null;
  pickingTypeId: string | null;
  returnPickingTypeId: string | null;
  linked: { id: string; locationId: string | null; locationDestId: string | null; productUomQty: number }[];
};

// A negative demand left after merging is a return: the products come back
// from where the move was sending them.
export const planNegativeMoves = (moves: NegativeMove[]): NegativeMovePlan[] =>
  moves
    .filter((move) => move.productUomQty < 0)
    .map((move) => {
      const newSource = move.locationDestId;
      const newDestination = move.locationId;
      const moveOrigIds: string[] = [];
      const moveDestIds: string[] = [];

      for (const other of move.linked) {
        const [from, to] =
          other.productUomQty < 0 ? [other.locationDestId, other.locationId] : [other.locationId, other.locationDestId];

        if (to === newSource) {
          moveOrigIds.push(other.id);
        } else if (newDestination === from) {
          moveDestIds.push(other.id);
        }
      }

      return {
        moveId: move.id,
        data: {
          locationId: newSource,
          locationDestId: newDestination,
          locationFinalId: move.locationId,
          productUomQty: -move.productUomQty,
          pickingTypeId: move.returnPickingTypeId ?? move.pickingTypeId,
          procureMethod: PROCURE_METHOD.MAKE_TO_STOCK,
          pickingId: null,
        },
        moveOrigIds,
        moveDestIds,
      };
    });
