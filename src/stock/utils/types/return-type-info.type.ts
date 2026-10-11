import { type PickingTypeRow } from 'src/stock/types/picking-type-row.type';

export type ReturnTypeInfo = Pick<
  PickingTypeRow,
  'id' | 'code' | 'defaultLocationDestId' | 'returnPickingTypeId' | 'warehouseId' | 'referenceSequenceId'
>;
