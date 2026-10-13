import { type LeadRow } from 'src/crm/lead/types/lead-row.type';
import { type StageRow } from 'src/crm/lead/types/stage-row.type';

// What Mark lost reads and writes: the leads and stages as the clicking user
// sees them, the notes, the user's writes and the app's.
export type MarkLeadsLostStore = {
  readLeads: (leadIds: string[]) => Promise<LeadRow[]>;
  readStages: () => Promise<StageRow[]>;
  requireUpdateRights: () => Promise<void>;
  noteTitle: () => Promise<string>;
  addNotes: (items: { id: string; recordId: string; title: string; body: string }[]) => Promise<void>;
  updateLeadsAsUser: (leadIds: string[], data: Record<string, unknown>) => Promise<void>;
  writeLeadsAsApplication: (leadIds: string[], data: Record<string, unknown>) => Promise<void>;
};
