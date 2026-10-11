import { type ProcurementValues } from 'src/stock/utils/procurement/types/procurement-values.type';

export type Procurement = {
  productId: string;
  productQty: number;
  productUomId: string;
  locationId: string;
  name: string;
  origin: string | null;
  values: ProcurementValues;
};
