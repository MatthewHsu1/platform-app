import { type AllowNewProduct } from 'src/stock/putaway/types/allow-new-product.type';

export type StorageCategory = {
  id: string;
  maxWeight: number;
  allowNewProduct: AllowNewProduct;
  // Keyed by product id.
  productCapacities: Map<string, number>;
  // Keyed by package type id.
  packageTypeCapacities: Map<string, number>;
};
