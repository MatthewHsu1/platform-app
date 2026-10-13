import { MOVE_STATE, PRIORITY, PROCURE_METHOD } from 'src/stock/stock-options.constant';
import { isLocationUnder } from 'src/stock/utils/location-usage.util';
import { type RetryCandidate } from 'src/stock/utils/types/retry-candidate.type';

type RetryDoneMove = {
  productId: string;
  locationDestId: string;
  locationDestParentPath: string | null;
  referenceIds: string[];
};
export const planRetryWaitingMoves = ({
  doneMoves,
  candidates,
  today,
}: {
  doneMoves: RetryDoneMove[];
  candidates: RetryCandidate[];
  today: string;
}) => {
  const destinations = new Map<string, { parentPath: string | null; productIds: Set<string> }>();

  for (const move of doneMoves) {
    const group = destinations.get(move.locationDestId) ?? { parentPath: move.locationDestParentPath, productIds: new Set<string>() };
    group.productIds.add(move.productId);
    destinations.set(move.locationDestId, group);
  }
  const references = new Set(doneMoves.flatMap((move) => move.referenceIds));
  const sharesReference = (move: RetryCandidate) => move.referenceIds.some((id) => references.has(id));

  return candidates
    .filter(
      (move) =>
        (move.state === MOVE_STATE.CONFIRMED || move.state === MOVE_STATE.PARTIALLY_AVAILABLE) &&
        move.procureMethod === PROCURE_METHOD.MAKE_TO_STOCK &&
        (move.reservesAtConfirm || (move.reservationDate !== null && move.reservationDate <= today)) &&
        [...destinations.values()].some(
          (group) => group.productIds.has(move.productId) && isLocationUnder(group.parentPath, move.locationParentPath),
        ),
    )
    .sort(
      (a, b) =>
        Number(b.priority === PRIORITY.URGENT) - Number(a.priority === PRIORITY.URGENT) ||
        (a.date ?? '').localeCompare(b.date ?? '') ||
        a.id.localeCompare(b.id),
    )
    .sort((a, b) => Number(sharesReference(b)) - Number(sharesReference(a)))
    .map((move) => move.id);
};
