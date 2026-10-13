export type MoveForLots = {
  id: string;
  state: string;
  productId: string | null;
  productUomId: string | null;
  locationId: string | null;
  locationDestId: string | null;
  pickingId: string | null;
  productQty: number | null;
  product: {
    productTmpl: {
      uomId: string | null;
      tracking: string | null;
      useExpirationDate: boolean | null;
      expirationTime: number | null;
      lotSequence: {
        id: string;
        prefix: string | null;
        padding: number | null;
        numberNext: number | null;
        numberIncrement: number | null;
      } | null;
    } | null;
  } | null;
  pickingType: { useExistingLots: boolean | null } | null;
  picking: { scheduledDate: string | null; pickingType: { useExistingLots: boolean | null } | null } | null;
};
