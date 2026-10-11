import { type LotLabelFormat } from 'src/stock/printing/types/lot-label-format.type';
import { type ProductLabelFormat } from 'src/stock/printing/types/product-label-format.type';

// A validated transfer as auto-print sees it: its operation type's print settings and what its
// moves and lines hold.
export type AutoprintPicking = {
  id: string;
  pickingTypeCode: string;
  autoPrintDeliverySlip: boolean;
  autoPrintReturnSlip: boolean;
  autoPrintReceptionReport: boolean;
  autoPrintReceptionReportLabels: boolean;
  autoPrintProductLabels: boolean;
  productLabelFormat: ProductLabelFormat;
  autoPrintLotLabels: boolean;
  lotLabelFormat: LotLabelFormat;
  autoPrintPackages: boolean;
  hasDestinationMoves: boolean;
  hasLots: boolean;
  hasResultPackages: boolean;
};
