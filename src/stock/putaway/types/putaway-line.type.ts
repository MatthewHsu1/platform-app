// A move line that is neither done nor cancelled. Draft lines count only
// when the question is whether another product is on its way.
export type PutawayLine = {
  id: string;
  productId: string;
  locationId: string;
  locationDestId: string;
  quantityProductUom: number;
  resultPackageId: string | null;
  resultPackageTypeId: string | null;
  isDraft: boolean;
};
