import { type PickingTypeCode } from 'src/stock/types/picking-type-code.type';

export type PickingTypeCodeRow = {
  id: string;
  pickingTypeId: string | null;
  pickingTypeCode: PickingTypeCode | null;
};
