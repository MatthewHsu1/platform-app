export type FreeReservationPlan = {
  destroy: string[];
  shrink: { lineId: string; quantityProductUom: number }[];
  movesToReassign: string[];
};
