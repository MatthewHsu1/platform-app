import { type MoveState } from 'src/stock/types/move-state.type';

type MergeData = { productUomQty: number; date: string | null; origin: string | null; state: MoveState };
type AbsorbData = { productUomQty: number; priceUnitMicros: number };

export type MergePlan = {
  merges: { keepId: string; absorbedIds: string[]; data: MergeData; addMoveOrigIds: string[]; addMoveDestIds: string[] }[];
  absorbs: { positiveId: string; data: AbsorbData; addMoveOrigIds: string[]; addMoveDestIds: string[] }[];
  negativeUpdates: { negativeId: string; productUomQty: number; priceUnitMicros: number }[];
  destroy: string[];
  cancel: string[];
  survivors: string[];
};
