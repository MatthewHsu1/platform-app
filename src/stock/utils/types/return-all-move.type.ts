export type ReturnAllMove = {
  id: string;
  quantity: number | null;
  destinationMoves: { originReturnedMoveId: string | null; quantity: number | null }[];
};
