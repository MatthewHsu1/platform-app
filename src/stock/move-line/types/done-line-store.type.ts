import { type LotCompensation } from 'src/stock/lot/types/lot-compensation.type';
import { type FreeReservationPlan } from 'src/stock/utils/types/free-reservation-plan.type';

export type DoneLineStore = {
  applyQuantDelta: (args: { key: string; delta: number; inDate: string | null }) => Promise<{ quantId: string; quantity: number; inDate: string }>;
  readRemovalInDate: (key: string) => Promise<string>;
  readLineQuantity: (lineId: string) => Promise<number | null>;
  readAvailable: (key: string) => Promise<number>;
  // false when a row with this id is already there.
  createLotCompensation: (row: LotCompensation) => Promise<boolean>;
  recomputeReserved: (keys: string[]) => Promise<void>;
  planReservationRelease: (args: { key: string; shortfall: number; pickingId: string | null; ignoreLineIds: string[] }) => Promise<FreeReservationPlan>;
  releaseReservation: (key: string, plan: FreeReservationPlan) => Promise<void>;
  readOpenDestinationMoveIds: (moveIds: string[]) => Promise<string[]>;
  unreserveMoves: (moveIds: string[]) => Promise<void>;
  assignMoves: (moveIds: string[]) => Promise<void>;
  recomputeMove: (moveIds: string[]) => Promise<void>;
  recomputeProductQuantities: (productIds: string[]) => Promise<void>;
  recomputeTrackingForKeys: (keys: string[]) => Promise<void>;
  writeLine: (lineId: string, data: Record<string, unknown>) => Promise<void>;
  addPickingNote: (pickingId: string, text: string) => Promise<void>;
  now: () => string;
  digits: () => number;
};
