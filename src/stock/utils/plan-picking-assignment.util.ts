import { PRIORITY } from 'src/stock/stock-options.constant';
import { type AssignMove } from 'src/stock/utils/types/assign-move.type';
import { type OpenPicking } from 'src/stock/utils/types/open-picking.type';

type PickingAssignmentPlan =
  | {
      kind: 'reuse';
      pickingId: string;
      moveIds: string[];
      update: { companyId?: null; personId?: null; origin?: string | null };
    }
  | {
      kind: 'create';
      moveIds: string[];
      values: {
        origin: string | null;
        companyId: string | null;
        personId: string | null;
        pickingTypeId: string;
        locationId: string | null;
        locationDestId: string | null;
      };
    }
  | { kind: 'skip' };

const MAX_ORIGINS = 5;

const isSameContact = (
  left: { companyId: string | null; personId: string | null },
  right: { companyId: string | null; personId: string | null },
) => left.companyId === right.companyId && left.personId === right.personId;

const distinct = (values: string[]) => [...new Set(values)];

// The transfer list order: urgent first, earliest scheduled date (undated last), newest.
export const pickAssignmentCandidate = (candidates: OpenPicking[]) =>
  [...candidates].sort(
    (left, right) =>
      Number(right.priority === PRIORITY.URGENT) - Number(left.priority === PRIORITY.URGENT) ||
      Number(left.scheduledDate === null) - Number(right.scheduledDate === null) ||
      (left.scheduledDate ?? '').localeCompare(right.scheduledDate ?? '') ||
      right.createdAt.localeCompare(left.createdAt),
  )[0] ?? null;

export const planPickingAssignment = ({
  moves,
  candidate,
}: {
  moves: AssignMove[];
  candidate: OpenPicking | null;
}): PickingAssignmentPlan => {
  if (candidate !== null) {
    const update: { companyId?: null; personId?: null; origin?: string | null } = {};
    const hasContact = candidate.companyId !== null || candidate.personId !== null;

    if (hasContact && moves.some((move) => !isSameContact(move, candidate))) {
      update.companyId = null;
      update.personId = null;
    }

    if (moves.some((move) => move.origin !== candidate.origin)) {
      const current = candidate.origin === null ? [] : candidate.origin.split(',');
      const added = moves.flatMap((move) => (move.origin === null || move.origin === '' ? [] : [move.origin]));
      const joined = distinct([...current, ...added]).join(',');
      const origin = joined === '' ? null : joined;

      if (origin !== candidate.origin) {
        update.origin = origin;
      }
    }

    return { kind: 'reuse', pickingId: candidate.id, moveIds: moves.map((move) => move.id), update };
  }

  // Negative moves are turned into returns and find their own transfer.
  const kept = moves.filter((move) => move.productUomQty >= 0);

  if (kept.length === 0) {
    return { kind: 'skip' };
  }

  const origins = distinct(kept.flatMap((move) => (move.origin === null || move.origin === '' ? [] : [move.origin])));
  const contacts = distinct(kept.map((move) => `${move.companyId ?? ''}|${move.personId ?? ''}`));
  const shared = contacts.length === 1 ? kept[0] : null;

  return {
    kind: 'create',
    moveIds: kept.map((move) => move.id),
    values: {
      origin:
        origins.length === 0
          ? null
          : `${origins.slice(0, MAX_ORIGINS).join(',')}${origins.length > MAX_ORIGINS ? '...' : ''}`,
      companyId: shared?.companyId ?? null,
      personId: shared?.personId ?? null,
      pickingTypeId: kept[0].pickingTypeId,
      locationId: kept[0].locationId,
      locationDestId: kept[0].locationDestId,
    },
  };
};
