import { WON_STATUS } from 'src/crm/crm-options.constant';
import { type StatusMoves } from 'src/crm/lead/types/status-moves.type';

// Lost stands for an archived lead; an empty probability counts as 0.
export const planWonStatus = ({
  probability,
  stageIsWon,
  archived,
}: {
  probability: number | null;
  stageIsWon: boolean;
  archived: boolean;
}) => {
  if (probability === 100 && stageIsWon) {
    return WON_STATUS.WON;
  }
  if (archived && (probability ?? 0) === 0) {
    return WON_STATUS.LOST;
  }

  return WON_STATUS.PENDING;
};

const move = (before: boolean, after: boolean): -1 | 0 | 1 => (after && !before ? 1 : before && !after ? -1 : 0);

export const statusMovesBetween = (oldStatus: string | null, newStatus: string | null): StatusMoves => ({
  won: move(oldStatus === WON_STATUS.WON, newStatus === WON_STATUS.WON),
  lost: move(oldStatus === WON_STATUS.LOST, newStatus === WON_STATUS.LOST),
});
