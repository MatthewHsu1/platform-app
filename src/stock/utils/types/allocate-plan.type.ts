// What an allocation changes, quantities in the product's unit. A line split
// keeps `outQuantity` on the delivery move and sends `remainderQuantity` to the
// remainder move; with `outQuantity` 0 the whole line goes there.
export type AllocatePlan = {
  splits: { outId: string; remainderQty: number; reservationDate: string | null }[];
  lineSplits: { outId: string; lineId: string; outQuantity: number; remainderQuantity: number }[];
  links: { inId: string; outId: string }[];
  makeToOrder: string[];
  references: { pickingId: string; referenceIds: string[] }[];
  assignMoveIds: string[];
};
