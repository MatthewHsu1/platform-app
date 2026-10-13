import { type ProductTracking } from 'src/stock/types/product-tracking.type';

export type SerialCheckLine = {
  id: string;
  productId: string;
  productName: string;
  tracking: ProductTracking;
  quantityProductUom: number;
  lotId: string | null;
  locationId: string;
  locationDestId: string;
  moveLocationDestId: string;
};
