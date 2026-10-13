// How a click stopped by an error left its order. 'unknown': its claims could
// not be read or settled, so whether anything was ordered is not known yet.
export type SettledOrderRun =
  | { kind: 'nothingWritten' }
  | { kind: 'pending'; notReachedIds: string[] }
  | { kind: 'finished'; writtenIds: string[] }
  | { kind: 'unknown' };
