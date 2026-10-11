import { type PickingPrintLine } from 'src/stock/printing/types/picking-print-line.type';

export type PickingPrintMove = {
  productId: string;
  productName: string;
  productBarcode: string;
  descriptionPicking: string;
  state: string;
  demand: number;
  quantity: number;
  uomName: string;
  packagingUomName: string | null;
  packagingQty: number;
  // How many packaging units one unit of the move holds; null without a packaging unit.
  packagingFactor: number | null;
  isTracked: boolean;
  lines: PickingPrintLine[];
};
