import { type MoveState } from 'src/stock/types/move-state.type';

export type DoneLineData = {
  id: string;
  state: MoveState;
  quantity: number;
  productUomId: string;
  quantityProductUom: number;
  picked: boolean;
  productId: string;
  locationId: string;
  locationDestId: string;
  ownerId: string | null;
  lotId: string | null;
  packageId: string | null;
  resultPackageId: string | null;
};
