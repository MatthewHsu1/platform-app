type LineState = { active: boolean; deletedAt: string | null };

// Creating a line brings back an archived line of the same product and
// attribute instead of making a new one. Here the new line was saved, so the
// merge archives it, deletes it and activates the old one. Only that pair
// reads as a merge: a staff delete of an active line is a real delete, even
// when a second line of the same attribute exists.
export const isMergedAwayLine = (line: LineState, sameAttributeLines: LineState[]) =>
  line.deletedAt !== null &&
  !line.active &&
  sameAttributeLines.some((other) => other.deletedAt === null && other.active);
