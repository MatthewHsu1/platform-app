import { type ProcurementQuant } from 'src/stock/utils/procurement/types/procurement-quant.type';
import { type RoutingProduct } from 'src/stock/utils/procurement/types/routing-product.type';
import { type ResolvedUom } from 'src/uom/utils/types/resolved-uom.type';

// What planning reads besides the rules.
export type ProcurementContext = {
  runId: string;
  now: string;
  digits: number;
  products: Map<string, RoutingProduct>;
  units: Map<string, ResolvedUom>;
  quants: ProcurementQuant[];
  internalTransitLocationId: string | null;
  warehousePartnerIds: Map<string, string | null>;
  pickingTypes: Map<string, { warehouseId: string | null; defaultLocationDestId: string | null }>;
  existingMoveDestinations: Map<string, string | null>;
  referenceNames: Map<string, string>;
};
