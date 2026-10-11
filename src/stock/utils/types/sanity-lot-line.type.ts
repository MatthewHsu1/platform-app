import { type ProductTracking } from 'src/stock/types/product-tracking.type';

export type SanityLotLine = {
  pickingId: string | null;
  pickingName: string;
  productName: string;
  tracking: ProductTracking;
  quantity: number;
  picked: boolean;
  pickingUsesLots: boolean;
  lotId: string | null;
  lotName: string | null;
};
