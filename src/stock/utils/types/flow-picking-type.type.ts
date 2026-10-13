import { type PickingTypeRow } from 'src/stock/types/picking-type-row.type';

export type FlowPickingType = Pick<
  PickingTypeRow,
  'id' | 'active' | 'defaultLocationSrcId' | 'defaultLocationDestId' | 'barcode' | 'referenceSequenceId' | 'sequenceCode'
>;
