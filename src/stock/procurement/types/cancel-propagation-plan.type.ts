export type CancelPropagationPlan = {
  // The moves asked first, then the ones their chains reach, in the order they are reached.
  cancel: string[];
  makeToStock: string[];
  unlink: { moveOrigId: string; moveDestId: string }[];
};
