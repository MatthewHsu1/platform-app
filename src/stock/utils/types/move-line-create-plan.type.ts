export type MoveLineCreatePlan = {
  newMove: Record<string, unknown> | null;
  moveId: string | null;
  lineData: Record<string, unknown>;
  reservationNeeded: boolean;
  applyDone: boolean;
};
