// A move of a transfer that names a service order names it too. A transfer without an order leaves its moves
// alone. Returns the order to write on the move, or null when there is nothing to write.
export const planMoveOrder = (pickingOrderId: string | null, moveOrderId: string | null): string | null =>
  pickingOrderId !== null && pickingOrderId !== moveOrderId ? pickingOrderId : null;
