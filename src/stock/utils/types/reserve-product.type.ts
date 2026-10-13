import { type RemovalMethod } from 'src/stock/removal/types/removal-method.type';
import { type PackagingReserveMethod } from 'src/stock/types/packaging-reserve-method.type';
import { type ProductTracking } from 'src/stock/types/product-tracking.type';

export type ReserveProduct = {
  uomId: string;
  packagingReserveMethod: PackagingReserveMethod;
  // The category's forced removal strategy; it wins over the locations' strategies.
  categoryRemovalMethod?: RemovalMethod | null;
  tracking?: ProductTracking;
  // Stock to be removed before the move's date is not reserved.
  useExpirationDate?: boolean;
};
