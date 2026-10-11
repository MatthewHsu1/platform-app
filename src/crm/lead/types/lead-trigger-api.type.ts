import { type LeadContext } from 'src/crm/lead/types/lead-context.type';
import { type LeadRow } from 'src/crm/lead/types/lead-row.type';
import { type PersonPush } from 'src/crm/lead/types/person-push.type';
import { type StatusMoves } from 'src/crm/lead/types/status-moves.type';

export type LeadTriggerApi = {
  now: () => string;
  // The lead fields `readLeads` returns.
  readFields: ReadonlySet<string>;
  readLeads: (ids: string[]) => Promise<LeadRow[]>;
  loadContext: (leads: LeadRow[]) => Promise<LeadContext>;
  updateLead: (id: string, data: Record<string, unknown>) => Promise<void>;
  putBackLead: (id: string, data: Record<string, unknown>, reason: string) => Promise<void>;
  destroyLead: (id: string) => Promise<void>;
  pushPerson: (push: PersonPush) => Promise<void>;
  applyStatusMoves: (moves: { lead: LeadRow; moves: StatusMoves }[]) => Promise<void>;
  memberLocale: (workspaceMemberId: string | undefined) => Promise<string>;
  translate: (locale: string | null, message: string) => string;
};
