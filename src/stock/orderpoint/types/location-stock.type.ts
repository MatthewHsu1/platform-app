import { type MoveState } from 'src/stock/types/move-state.type';

// The stock and open moves of some products at one location and every location under it.
export type LocationStock = {
  products: { id: string; templateId: string; productType: string }[];
  scopeLocationIds: Set<string>;
  quants: { productId: string; locationId: string; quantity: number; reservedQuantity: number; removalDate: string | null }[];
  moves: {
    productId: string;
    state: MoveState;
    productQty: number | null;
    locationId: string;
    locationDestId: string;
    locationFinalId: string | null;
    date: string;
  }[];
};
