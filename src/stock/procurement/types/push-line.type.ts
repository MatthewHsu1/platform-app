// A done line of a move a push moves on, quantity in the product unit.
export type PushLine = {
  id: string;
  locationDestId: string;
  quantityProductUom: number;
  lotId: string | null;
  // Done stock sits in the line's result package.
  resultPackageId: string | null;
  ownerId: string | null;
};
