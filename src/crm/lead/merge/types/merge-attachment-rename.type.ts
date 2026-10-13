import { type MergeAttachmentFile } from 'src/crm/lead/merge/types/merge-attachment-file.type';

// The new name of a moved attachment and of its files; a part left out keeps its name.
export type MergeAttachmentRename = { name?: string; files?: MergeAttachmentFile[] };
