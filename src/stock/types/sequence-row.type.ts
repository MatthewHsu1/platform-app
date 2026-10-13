export type SequenceRow = {
  id: string;
  name: string | null;
  code: string | null;
  prefix: string | null;
  padding: number;
  numberNext: number;
  numberIncrement: number;
  active: boolean;
  seedKey: string | null;
};
