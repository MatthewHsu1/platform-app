import { type MoveState } from 'src/stock/types/move-state.type';

export type OpenLineValues = {
  productId: string;
  locationId: string | null;
  locationDestId: string | null;
  ownerId: string | null;
  lotId?: string | null;
  packageId?: string | null;
  resultPackageId?: string | null;
  productUomId: string | null;
  quantity: number;
  quantityProductUom: number;
  picked: boolean;
  state: MoveState;
  moveId: string | null;
};
