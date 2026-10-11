export const MOVE_SPLIT_MESSAGES = {
  closed: "You cannot split a stock move that has been set to 'Done' or 'Cancel'.",
  draft: 'You cannot split a draft move. It needs to be confirmed first.',
  nothing: 'There is no quantity to split off this move.',
} as const;
