// What taking incoming moves off a delivery move changes, quantities in the
// product's unit. The part still fed by other incoming moves goes to a new
// move: a line split keeps `outQuantity` on the delivery move and sends
// `newQuantity` to the new move; with `outQuantity` 0 the whole line goes there.
export type UnallocatePlan = {
  unlinks: { inId: string; outId: string }[];
  split: null | {
    newDemand: number;
    reservationDate: string | null;
    originIds: string[];
    lineSplits: { lineId: string; outQuantity: number; newQuantity: number }[];
  };
  referencesToRemove: { pickingId: string; referenceIds: string[] }[];
  makeToStock: string;
  unreserve: string;
};
