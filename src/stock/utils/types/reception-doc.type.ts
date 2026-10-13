import { type PickingState } from 'src/stock/types/picking-state.type';
import { type PickingTypeCode } from 'src/stock/types/picking-type-code.type';

export type ReceptionDoc = { id: string; state: PickingState; pickingTypeCode: PickingTypeCode };
