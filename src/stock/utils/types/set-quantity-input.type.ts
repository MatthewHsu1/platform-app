import { type ProductTracking } from 'src/stock/types/product-tracking.type';
import { type ResolvedUom } from 'src/uom/utils/types/resolved-uom.type';
import { type SetQuantityLine } from 'src/stock/utils/types/set-quantity-line.type';
import { type SetQuantityQuant } from 'src/stock/utils/types/set-quantity-quant.type';

export type SetQuantityInput = {
  target: number;
  moveUomId: string;
  productUomId: string;
  moveLocationId: string;
  bypassReservation: boolean;
  lines: SetQuantityLine[];
  freeByKey: Map<string, number>;
  quants: SetQuantityQuant[];
  uoms: Map<string, ResolvedUom>;
  digits: number;
  tracking?: ProductTracking;
};
