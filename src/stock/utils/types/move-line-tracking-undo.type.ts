export type MoveLineTrackingUndo =
  | { kind: 'putBack'; data: Record<string, unknown> }
  | { kind: 'destroy'; noteOn: { objectSingular: 'stockPicking' | 'stockMove'; recordId: string } | null }
  | { kind: 'none' };
