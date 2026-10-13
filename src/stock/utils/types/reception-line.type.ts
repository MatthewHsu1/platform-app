// isQtyAssignable is false for quantities still on draft moves; isAssigned
// marks quantities already linked to the outgoing move.
export type ReceptionLine = {
  productId: string;
  quantity: number;
  moveOutId: string;
  moveInIds: string[];
  isQtyAssignable: boolean;
  isAssigned: boolean;
};
