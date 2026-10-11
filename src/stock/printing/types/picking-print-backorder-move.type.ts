// A move of a backorder of the printed transfer, at any depth.
export type PickingPrintBackorderMove = {
  pickingId: string;
  pickingState: string;
  // A backorder of the printed transfer itself, not of one of its backorders.
  isDirectBackorder: boolean;
  productId: string;
  productName: string;
  descriptionPicking: string;
  state: string;
  demand: number;
  quantity: number;
  uomName: string;
  packagingUomName: string | null;
  hasLines: boolean;
};
