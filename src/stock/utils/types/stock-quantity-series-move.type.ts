import { type MoveState } from 'src/stock/types/move-state.type';

// One product; productQty is the demand and quantityProductUom the done
// quantity, both in the product's unit.
export type StockQuantitySeriesMove = {
  state: MoveState;
  date: string;
  productQty: number;
  quantityProductUom: number;
  locationId: string;
  locationDestId: string;
  locationFinalId: string | null;
};
