// What the filter check found: the created rows whose filter cannot run (for
// the trigger to remove, with the reason in the saver's language), and the
// checks that failed to run.
export type FilterCheckOutcome = { refused: { recordId: string; reason: string }[]; problems: string[] };
