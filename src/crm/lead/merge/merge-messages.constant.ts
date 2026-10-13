// Texts of the merge: refusals, the summary note title and the names given to
// moved notes and files. Each is translated where it is shown or written.
export const MERGE_MESSAGES = {
  tooFew: 'Select at least two leads to merge.',
  tooFewWithoutWon: 'Select at least two leads to merge. Won leads are left out.',
  tooMany: 'Merge at most {max} leads at a time.',
  summaryTitle: 'Merge summary',
  movedNoteTitle: 'From {name}: {title}',
  movedNoteTitleEmpty: 'From {name}',
  movedAttachmentName: '{name} (from {lead})',
} as const;
