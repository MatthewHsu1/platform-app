// `onHand` is what the list showed when it was opened (0 for an added line).
export type QuantityUpdateRow = {
  quantId: string | null;
  productId: string;
  locationId: string;
  lotId: string | null;
  onHand: number;
  counted: number;
};
