import { type PickingTypeCode } from 'src/stock/types/picking-type-code.type';

export type OverviewTypeRow = {
  id: string;
  name: string;
  sequence: number | null;
  code: PickingTypeCode;
  warehouseId: string | null;
  warehouseName: string | null;
};
