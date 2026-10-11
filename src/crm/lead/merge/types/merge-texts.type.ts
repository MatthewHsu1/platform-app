// The translated patterns a merge renames moved notes and files with.
export type MergeTexts = {
  movedNoteTitle: (tailName: string, title: string) => string;
  movedNoteTitleEmpty: (tailName: string) => string;
  movedAttachmentName: (name: string, tailNameStart: string) => string;
};
