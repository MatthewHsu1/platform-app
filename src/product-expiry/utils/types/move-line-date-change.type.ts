// What moved since a move line's dates were last worked out. A new transfer on the line counts as a
// scheduled date change: the line's dates start from its transfer's scheduled date.
export type MoveLineDateChange = { created: boolean; lot: boolean; product: boolean; scheduledDate: boolean };
