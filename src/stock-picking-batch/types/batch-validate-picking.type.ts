// A batch transfer as batch Validate sorts it: its state, its moves' picked
// quantities and how many detailed lines it has.
export type BatchValidatePicking = {
  id: string;
  state: string;
  moves: { state: string; picked: boolean; quantity: number }[];
  lineCount: number;
};
