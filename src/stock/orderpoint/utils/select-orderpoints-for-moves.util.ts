import { type AutoOrderpoint } from 'src/stock/orderpoint/types/auto-orderpoint.type';
import { type ConfirmedMove } from 'src/stock/orderpoint/types/confirmed-move.type';
import { ORDERPOINT_TRIGGER } from 'src/stock/stock-options.constant';
import { OPEN_MOVE_STATES_FOR_FORECAST } from 'src/stock/utils/plan-product-quantities.util';

const isAncestorOrSelf = (paths: ReadonlyMap<string, string>, ancestorId: string, locationId: string) => {
  const ancestor = paths.get(ancestorId);
  const location = paths.get(locationId);

  return ancestor !== undefined && location !== undefined && location.startsWith(ancestor);
};

// One automatic rule per running move: same product, its location holds the
// move's source but not its destination, so the stock leaves the rule's area.
// The first by location full name wins, then the oldest rule.
export const selectOrderpointsForMoves = ({
  moves,
  orderpoints,
  locationPaths,
}: {
  moves: ConfirmedMove[];
  orderpoints: AutoOrderpoint[];
  locationPaths: ReadonlyMap<string, string>;
}) => {
  const ordered = orderpoints
    .filter((orderpoint) => orderpoint.trigger === ORDERPOINT_TRIGGER.AUTO && orderpoint.active)
    .sort(
      (left, right) =>
        left.locationCompleteName.localeCompare(right.locationCompleteName) ||
        left.createdAt.localeCompare(right.createdAt) ||
        left.id.localeCompare(right.id),
    );
  const orderpointIds = new Set<string>();
  const origins = new Map<string, string[]>();

  for (const move of moves) {
    if (!(OPEN_MOVE_STATES_FOR_FORECAST as string[]).includes(move.state)) {
      continue;
    }
    const orderpoint = ordered.find(
      (candidate) =>
        candidate.productId === move.productId &&
        isAncestorOrSelf(locationPaths, candidate.locationId, move.locationId) &&
        !isAncestorOrSelf(locationPaths, candidate.locationId, move.locationDestId),
    );

    if (orderpoint === undefined) {
      continue;
    }
    orderpointIds.add(orderpoint.id);
    if (move.productQty > orderpoint.productMinQty && move.referenceIds.length > 0) {
      origins.set(orderpoint.id, [...new Set([...(origins.get(orderpoint.id) ?? []), ...move.referenceIds])]);
    }
  }

  return { orderpointIds: [...orderpointIds], origins };
};
