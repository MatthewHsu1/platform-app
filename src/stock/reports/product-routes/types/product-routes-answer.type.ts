import { type ProductRoutesReport } from 'src/stock/utils/types/product-routes-report.type';

export type ProductRoutesAnswer = {
  variants: { id: string; name: string }[];
  variantId: string | null;
  warehouses: { id: string; name: string }[];
  chosenWarehouseIds: string[];
  report: ProductRoutesReport;
};
