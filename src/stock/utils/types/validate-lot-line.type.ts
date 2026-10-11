import { type ProductTracking } from 'src/stock/types/product-tracking.type';

export type ValidateLotLine = {
  id: string;
  productId: string;
  productName: string;
  tracking: ProductTracking;
  quantity: number;
  lotId: string | null;
  lotName: string | null;
  expirationDate: string | null;
  hasPickingType: boolean;
  useCreateLots: boolean;
  useExistingLots: boolean;
  isInventory: boolean;
  isScrap: boolean;
};
