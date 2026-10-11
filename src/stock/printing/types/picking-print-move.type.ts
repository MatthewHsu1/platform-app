import { type PickingPrintLine } from 'src/stock/printing/types/picking-print-line.type';

export type PickingPrintMove = {
  productName: string;
  productBarcode: string;
  descriptionPicking: string;
  demand: number;
  quantity: number;
  uomName: string;
  packagingUomName: string | null;
  packagingQty: number;
  isTracked: boolean;
  lines: PickingPrintLine[];
};
