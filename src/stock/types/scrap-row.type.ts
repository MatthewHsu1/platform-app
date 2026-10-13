import { type ScrapState } from 'src/stock/types/scrap-state.type';

export type ScrapRow = {
  id: string;
  name: string | null;
  origin: string | null;
  productId: string | null;
  productUomId: string | null;
  ownerId: string | null;
  lotId: string | null;
  packageId: string | null;
  pickingId: string | null;
  locationId: string | null;
  scrapLocationId: string | null;
  scrapQty: number;
  state: ScrapState;
  dateDone: string | null;
  shouldReplenish: boolean;
};
