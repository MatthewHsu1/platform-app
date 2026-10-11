// A delivery line's write, quantities in the line's own unit: the whole line
// goes to another move, or the line keeps `quantity` and a copy holding
// `copyQuantity` goes to the other move.
export type AllocationLineWrite =
  | { kind: 'move'; lineId: string; moveId: string }
  | {
      kind: 'split';
      lineId: string;
      moveId: string;
      quantity: number;
      copyId: string;
      copyMoveId: string;
      copyQuantity: number;
    };
