import { type MoveState } from 'src/stock/types/move-state.type';

export type MoveLineRow = {
  id: string;
  name: string | null;
  pickingId: string | null;
  moveId: string | null;
  productId: string;
  productUomId: string | null;
  quantity: number;
  quantityProductUom: number | null;
  picked: boolean;
  date: string | null;
  ownerId: string | null;
  lotId: string | null;
  packageId: string | null;
  resultPackageId: string | null;
  locationId: string | null;
  locationDestId: string | null;
  state: MoveState;
  createdAt: string;
};
