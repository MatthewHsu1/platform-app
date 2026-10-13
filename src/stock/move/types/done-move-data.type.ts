import { type MoveState } from 'src/stock/types/move-state.type';
import { type PickingTypeCode } from 'src/stock/types/picking-type-code.type';
import { type ProcureMethod } from 'src/stock/types/procure-method.type';
import { type DoneLineData } from 'src/stock/move/types/done-line-data.type';

export type DoneMoveData = {
  id: string;
  state: MoveState;
  picked: boolean;
  productUomQty: number;
  productQty: number;
  isInventory: boolean;
  productId: string;
  productUomId: string;
  productUnitUomId: string;
  isStorable: boolean;
  pickingId: string | null;
  pickingTypeCode: PickingTypeCode | null;
  procureMethod: ProcureMethod;
  moveOrigIds: string[];
  openMoveDestIds: string[];
  referenceIds: string[];
  copyValues: Record<string, unknown>;
  lines: DoneLineData[];
};
