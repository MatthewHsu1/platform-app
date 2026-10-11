import { MOVE_STATE, PROCURE_METHOD, RESERVATION_METHOD } from 'src/stock/stock-options.constant';
import { type ConfirmMove } from 'src/stock/utils/types/confirm-move.type';

// The rule procure method that confirms the move and orders only what free
// stock does not cover. Routes fill ruleProcureMethod.
export const MTS_ELSE_MTO = 'MTS_ELSE_MTO';

type ConfirmPlan = {
  confirmed: string[];
  waiting: string[];
  procure: string[];
  reserveToday: string[];
  assignGroups: { key: string; moveIds: string[] }[];
};

const sortedUnique = (ids: string[]) => [...new Set(ids)].sort();

export const pickingAssignmentKey = (
  move: Pick<ConfirmMove, 'referenceIds' | 'locationId' | 'locationDestId' | 'pickingTypeId' | 'moveOrigPickingIds'>,
) => {
  const parts = [
    sortedUnique(move.referenceIds).join(','),
    move.locationId ?? '',
    move.locationDestId ?? '',
    move.pickingTypeId ?? '',
  ];

  // Without a reference, moves fed by different transfers stay apart.
  if (move.referenceIds.length === 0 && move.moveOrigPickingIds.length > 0) {
    parts.push(sortedUnique(move.moveOrigPickingIds).join(','));
  }

  return parts.join('|');
};

export const planConfirm = (
  moves: ConfirmMove[],
  { createProcurement }: { createProcurement: boolean },
): ConfirmPlan => {
  const plan: ConfirmPlan = { confirmed: [], waiting: [], procure: [], reserveToday: [], assignGroups: [] };
  const groups = new Map<string, string[]>();

  for (const move of moves) {
    if (move.state !== MOVE_STATE.DRAFT) {
      continue;
    }

    if (move.moveOrigIds.length > 0) {
      plan.waiting.push(move.id);
    } else if (move.procureMethod === PROCURE_METHOD.MAKE_TO_ORDER) {
      plan.waiting.push(move.id);
      if (createProcurement) {
        plan.procure.push(move.id);
      }
    } else if (move.ruleProcureMethod === MTS_ELSE_MTO) {
      plan.confirmed.push(move.id);
      if (createProcurement) {
        plan.procure.push(move.id);
      }
    } else {
      plan.confirmed.push(move.id);
    }

    if (move.reservationMethod === RESERVATION_METHOD.AT_CONFIRM) {
      plan.reserveToday.push(move.id);
    }

    if (move.pickingId === null && move.pickingTypeId !== null) {
      const key = pickingAssignmentKey(move);
      groups.set(key, [...(groups.get(key) ?? []), move.id]);
    }
  }

  plan.assignGroups = [...groups].map(([key, moveIds]) => ({ key, moveIds }));

  return plan;
};
