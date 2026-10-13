// The scrap fields its move and move line are made from.
export type ScrapMoveInput = {
  scrapId: string;
  origin: string | null;
  productId: string;
  productUomId: string;
  scrapQty: number;
  scrapQtyProductUom: number;
  locationId: string;
  scrapLocationId: string;
  lotId: string | null;
  packageId: string | null;
  ownerId: string | null;
  pickingId: string | null;
};
