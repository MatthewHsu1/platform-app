import { type LeadContext } from 'src/crm/lead/types/lead-context.type';
import { type LeadRow } from 'src/crm/lead/types/lead-row.type';
import { type StatusMoves } from 'src/crm/lead/types/status-moves.type';

export type AppLeadWriteApi = {
  now: () => string;
  readLeads: (ids: string[]) => Promise<LeadRow[]>;
  loadContext: (leads: LeadRow[]) => Promise<LeadContext>;
  updateLeads: (ids: string[], data: Record<string, unknown>) => Promise<void>;
  updateLeadWhere: (filter: Record<string, unknown>, data: Record<string, unknown>) => Promise<string[]>;
  applyStatusMoves: (moves: { lead: LeadRow; moves: StatusMoves }[]) => Promise<void>;
};
