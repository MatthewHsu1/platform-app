import { type ReceptionDoc } from 'src/stock/utils/types/reception-doc.type';
import { type ReceptionMove } from 'src/stock/utils/types/reception-move.type';

// What the reception report is computed from. `moves` holds the selected
// transfers' moves in transfer order first, then the moves they feed and the
// deliveries that could take their goods. `products` names each product and
// its unit for display; `urgentPickingIds` are the urgent transfers among them.
export type ReceptionData = {
  docs: ReceptionDoc[];
  moves: ReceptionMove[];
  warehouseLocationIds: Set<string>;
  urgentPickingIds: string[];
  products: Record<string, { name: string; uomName: string }>;
};
