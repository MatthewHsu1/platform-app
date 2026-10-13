import { type MergeAttachment } from 'src/crm/lead/merge/types/merge-attachment.type';
import { type MergeAttachmentRename } from 'src/crm/lead/merge/types/merge-attachment-rename.type';
import { type MergeNote } from 'src/crm/lead/merge/types/merge-note.type';
import { type MergeSummaryNames } from 'src/crm/lead/merge/types/merge-summary-names.type';
import { type LeadContext } from 'src/crm/lead/types/lead-context.type';
import { type LeadRow } from 'src/crm/lead/types/lead-row.type';
import { type GraphqlCaller } from 'src/shared/twenty-graphql';

// Everything the merge reads and writes, so the engine runs against a fake in
// tests and against Twenty in the app.
export type MergeApi = {
  readLeads: (leadIds: string[], caller: GraphqlCaller) => Promise<LeadRow[]>;
  loadContext: (leads: LeadRow[]) => Promise<LeadContext>;
  readNames: (leads: LeadRow[], context: LeadContext) => Promise<MergeSummaryNames>;
  readLocale: (caller: GraphqlCaller) => Promise<string>;
  requireUpdateRight: (caller: GraphqlCaller) => Promise<void>;
  addNote: (note: { id: string; leadId: string; title: string; body: string }) => Promise<void>;
  // Notes in the trash are left out: they keep their title.
  listNotesOf: (leadId: string) => Promise<MergeNote[]>;
  renameNote: (noteId: string, title: string) => Promise<void>;
  // A link to a note or task the kept lead already has is removed instead of moved.
  moveNoteLinks: (fromLeadId: string, toLeadId: string) => Promise<void>;
  moveTaskLinks: (fromLeadId: string, toLeadId: string) => Promise<void>;
  listAttachmentsOf: (leadId: string) => Promise<MergeAttachment[]>;
  moveAttachment: (attachmentId: string, toLeadId: string, rename: MergeAttachmentRename) => Promise<void>;
  writeHead: (headId: string, data: Record<string, unknown>) => Promise<void>;
  softDeleteLeads: (leadIds: string[]) => Promise<void>;
};
