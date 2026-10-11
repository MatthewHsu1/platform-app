import { type Pricelist } from 'src/product/utils/types/pricelist.type';
import { type LabelMove } from 'src/stock/printing/types/label-move.type';
import { type LabelProduct } from 'src/stock/printing/types/label-product.type';

// Everything a product label print reads: the products in the order chosen, a transfer's moves
// (null when the print does not come from a transfer), and the chosen pricelist with the ones it builds on.
export type ProductLabelData = { products: LabelProduct[]; moves: LabelMove[] | null; pricelists: Pricelist[] };
