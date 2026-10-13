// Batch states code compares against (labels may change).
export const BATCH_STATE = {
  DRAFT: 'DRAFT',
  IN_PROGRESS: 'IN_PROGRESS',
  DONE: 'DONE',
  CANCEL: 'CANCEL',
} as const;

export const BATCH_SEQUENCE_CODE = 'picking.batch';
export const WAVE_SEQUENCE_CODE = 'picking.wave';

// The name a batch has until it gets an operation type.
export const DEFAULT_BATCH_NAME = 'New';
