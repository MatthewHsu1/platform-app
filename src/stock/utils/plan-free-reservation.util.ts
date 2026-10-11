import { compareAtDigits, isZeroAtDigits } from 'src/stock/utils/stock-uom.util';
import { type FreeReservationCandidate } from 'src/stock/utils/types/free-reservation-candidate.type';
import { type FreeReservationPlan } from 'src/stock/utils/types/free-reservation-plan.type';

const timestampKey = (date: string | null) => (date === null ? 0 : -Date.parse(date));

// Stock fell below what is reserved: the open, unpicked lines on that key give it back.
// Order: lines of the same transfer, then the latest scheduled date, then the newest line.
export const planFreeReservation = ({
  shortfall,
  pickingId,
  candidates,
  digits,
}: {
  shortfall: number;
  pickingId: string | null;
  candidates: FreeReservationCandidate[];
  digits: number;
}): FreeReservationPlan => {
  const ordered = [...candidates].sort(
    (a, b) =>
      Number(a.pickingId !== pickingId) - Number(b.pickingId !== pickingId) ||
      timestampKey(a.scheduledDate) - timestampKey(b.scheduledDate) ||
      b.createdAt.localeCompare(a.createdAt) ||
      b.lineId.localeCompare(a.lineId),
  );
  const plan: FreeReservationPlan = { destroy: [], shrink: [], movesToReassign: [] };
  const visited: string[] = [];
  let remaining = shortfall;

  for (const candidate of ordered) {
    if (candidate.moveId !== null && !visited.includes(candidate.moveId)) {
      visited.push(candidate.moveId);
    }
    if (compareAtDigits(candidate.quantityProductUom, remaining, digits) <= 0) {
      remaining -= candidate.quantityProductUom;
      plan.destroy.push(candidate.lineId);
      if (isZeroAtDigits(remaining, digits)) {
        break;
      }
    } else {
      plan.shrink.push({ lineId: candidate.lineId, quantityProductUom: candidate.quantityProductUom - remaining });
      break;
    }
  }

  // The moves are reassigned in the reverse of the order their lines were visited.
  return { ...plan, movesToReassign: visited.reverse() };
};
