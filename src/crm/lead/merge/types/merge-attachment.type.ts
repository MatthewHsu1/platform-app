import { type MergeAttachmentFile } from 'src/crm/lead/merge/types/merge-attachment-file.type';

export type MergeAttachment = { id: string; name: string | null; files: MergeAttachmentFile[] };
