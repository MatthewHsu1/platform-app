export type ConfirmedMove = {
  id: string;
  productId: string;
  state: string;
  locationId: string;
  locationDestId: string;
  productQty: number;
  referenceIds: string[];
};
