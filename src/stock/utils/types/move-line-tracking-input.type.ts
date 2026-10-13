import { type ProductTracking } from 'src/stock/types/product-tracking.type';

export type MoveLineTrackingInput = {
  tracking: ProductTracking;
  quantityProductUom: number;
  productId: string;
  productName: string;
  lotProductId: string | null;
  lotName: string | null;
  unitName: string;
  digits: number;
};
