export type SequenceStore = {
  read: (
    sequenceId: string,
  ) => Promise<{ prefix: string | null; padding: number; numberNext: number; numberIncrement: number } | null>;
  advance: (sequenceId: string, from: number, to: number) => Promise<boolean>;
  findActiveIdByCode: (code: string) => Promise<string | null>;
  wait: (ms: number) => Promise<void>;
};
