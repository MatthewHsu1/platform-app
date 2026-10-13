import { MERGE_MESSAGES } from 'src/crm/lead/merge/merge-messages.constant';
import { type MergeTexts } from 'src/crm/lead/merge/types/merge-texts.type';
import { translate } from 'src/shared/i18n/translate';

export const mergeTexts = (locale: string): MergeTexts => ({
  movedNoteTitle: (tailName, title) => translate(locale, MERGE_MESSAGES.movedNoteTitle, { name: tailName, title }),
  movedNoteTitleEmpty: (tailName) => translate(locale, MERGE_MESSAGES.movedNoteTitleEmpty, { name: tailName }),
  movedAttachmentName: (name, tailNameStart) => translate(locale, MERGE_MESSAGES.movedAttachmentName, { name, lead: tailNameStart }),
});
