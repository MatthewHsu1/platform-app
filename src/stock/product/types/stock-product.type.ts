import { type PackagingReserveMethod } from 'src/stock/types/packaging-reserve-method.type';
import { type ProductTracking } from 'src/stock/types/product-tracking.type';

export type StockProduct = {
  productId: string;
  templateId: string;
  displayName: string;
  defaultCode: string | null;
  templateName: string;
  productType: string;
  isStorable: boolean;
  tracking: ProductTracking;
  useExpirationDate: boolean;
  uomId: string;
  categId: string | null;
  packagingReserveMethod: PackagingReserveMethod;
  descriptionPicking: string | null;
  descriptionPickingin: string | null;
  descriptionPickingout: string | null;
  propertyStockInventoryId: string | null;
  propertyStockProductionId: string | null;
  templateDescription: string | null;
};
