export type ScrapFromPickingInput = {
  pickingId: string;
  productId: string;
  productUomId: string;
  scrapQty: number;
  locationId: string;
  scrapLocationId: string;
  ownerId: string | null;
  reasonTagIds: string[];
  shouldReplenish: boolean;
};
