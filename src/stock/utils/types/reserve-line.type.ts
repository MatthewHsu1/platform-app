export type ReserveLine = {
  id: string;
  locationId: string | null;
  locationDestId: string | null;
  ownerId: string | null;
  productUomId: string | null;
  quantity: number;
  quantityProductUom: number;
  picked: boolean;
  pickingId: string | null;
  lotId?: string | null;
  packageId?: string | null;
};
