import { type MergeTexts } from 'src/crm/lead/merge/types/merge-texts.type';

const TAIL_NAME_LENGTH = 20;

// Characters, not UTF-16 units: an emoji or accent must not be cut in half.
const startOf = (text: string) => Array.from(text).slice(0, TAIL_NAME_LENGTH).join('');

// A moved note says which merged-away lead it came from. A title that already
// says so is left alone, so running the merge again does not stack prefixes.
export const planMovedNoteTitle = ({
  tailName,
  title,
  texts,
}: {
  tailName: string | null;
  title: string | null;
  texts: MergeTexts;
}) => {
  const name = tailName ?? '';
  const empty = texts.movedNoteTitleEmpty(name);
  const prefix = texts.movedNoteTitle(name, '');

  if (title === empty || (title !== null && title.startsWith(prefix))) {
    return null;
  }

  return title === null || title.length === 0 ? empty : texts.movedNoteTitle(name, title);
};

// A moved file names the start of the merged-away lead, so files of the same
// name from several leads can be told apart.
export const planAttachmentName = ({
  name,
  tailName,
  texts,
}: {
  name: string | null;
  tailName: string | null;
  texts: MergeTexts;
}) => {
  const start = startOf(tailName ?? '');
  const suffix = texts.movedAttachmentName('', start);

  if (name !== null && name.endsWith(suffix)) {
    return null;
  }

  return texts.movedAttachmentName(name ?? '', start);
};
