import { groupBy } from 'src/shared/utils/group-by.util';
import { compareAtDigits } from 'src/stock/utils/stock-uom.util';

type CandidateMove = {
  productId: string;
  locationId: string | null;
  locationDestId: string | null;
  locationFinalId: string | null;
  productQty: number | null;
};

const sum = (values: number[]) => values.reduce((total, value) => total + value, 0);

// Products that will go negative in one replenish location: on hand + incoming
// − outgoing of the open moves over its subtree is below zero. A move counts as
// incoming only when it ends (its final location when set) in some replenish
// location; there it counts at its destination and at its final location. A
// move between two replenish locations so counts out at its source and in at
// its destination.
export const replenishmentCandidates = ({
  location,
  replenishLocations,
  locationPaths,
  quants,
  moves,
  digits,
}: {
  location: { id: string; parentPath: string };
  replenishLocations: { id: string; parentPath: string }[];
  locationPaths: ReadonlyMap<string, string>;
  quants: { productId: string; locationId: string; quantity: number | null }[];
  moves: CandidateMove[];
  digits: number;
}) => {
  const isUnder = (locationId: string | null, path: string) =>
    locationId !== null && locationPaths.get(locationId)?.startsWith(path) === true;
  const under = (locationId: string | null) => isUnder(locationId, location.parentPath);
  const inScope = (locationId: string | null) => replenishLocations.some((replenish) => isUnder(locationId, replenish.parentPath));
  const quantsByProduct = groupBy(
    quants.filter((quant) => under(quant.locationId)),
    (quant) => quant.productId,
  );
  const incomingByProduct = groupBy(
    moves.filter((move) => inScope(move.locationFinalId ?? move.locationDestId) && (under(move.locationDestId) || under(move.locationFinalId))),
    (move) => move.productId,
  );
  const outgoingByProduct = groupBy(
    moves.filter((move) => under(move.locationId)),
    (move) => move.productId,
  );
  const productIds = [...new Set([...quantsByProduct.keys(), ...incomingByProduct.keys(), ...outgoingByProduct.keys()])].sort();

  return productIds.filter((productId) => {
    const onHand = sum((quantsByProduct.get(productId) ?? []).map((quant) => quant.quantity ?? 0));
    const incoming = sum((incomingByProduct.get(productId) ?? []).map((move) => move.productQty ?? 0));
    const outgoing = sum((outgoingByProduct.get(productId) ?? []).map((move) => move.productQty ?? 0));

    return compareAtDigits(onHand + incoming - outgoing, 0, digits) < 0;
  });
};
