// Shown when a delete is refused because another record still points at
// this one.
export const RESTRICT_DELETE_MESSAGE =
  'The operation cannot be completed: another model requires the record being deleted. If possible, archive it instead.';

// Shown when a default removal strategy is deleted: reservation falls back on it.
export const SEEDED_REMOVAL_KEPT_MESSAGE = 'This removal strategy is kept: stock reservation uses it.';
