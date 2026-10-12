import { type ObjectRecordEvent } from 'twenty-sdk/define';

import { leadSelectionFields } from 'src/crm/lead/lead-selection';
import { type AppLeadWriteApi } from 'src/crm/lead/types/app-lead-write-api.type';
import { type LeadContext } from 'src/crm/lead/types/lead-context.type';
import { type LeadPersonPush } from 'src/crm/lead/types/lead-person-push.type';
import { type LeadRow } from 'src/crm/lead/types/lead-row.type';
import { type LeadTriggerApi } from 'src/crm/lead/types/lead-trigger-api.type';
import { type PartnerCompanyRow } from 'src/crm/lead/types/partner-company-row.type';
import { type PartnerPersonRow } from 'src/crm/lead/types/partner-person-row.type';
import { type StageRow } from 'src/crm/lead/types/stage-row.type';
import { type StatusMoves } from 'src/crm/lead/types/status-moves.type';
import { type MembershipRow } from 'src/sales-team/team/types/membership-row.type';
import { type TeamRow } from 'src/sales-team/team/types/team-row.type';

type Write = { id: string; before: LeadRow; after: LeadRow; fields: string[] };

const APP_ACTOR = { source: 'APPLICATION', workspaceMemberId: null };

// Matches the two guard shapes Platform sends: { field: { is: 'NULL' } } and { field: { eq: value } }.
const matchesGuard = (row: LeadRow, guard: Record<string, unknown>) =>
  Object.entries(guard).every(([field, condition]) => {
    const value = row[field as keyof LeadRow];
    const test = condition as { is?: string; eq?: unknown };

    if (test.is === 'NULL') {
      return value === null;
    }
    return value === test.eq;
  });

// A database event as the trigger receives it; tests give only the parts they need.
export const leadEvent = (event: {
  recordId: string;
  workspaceMemberId?: string;
  properties: { before?: unknown; after: unknown; updatedFields?: string[] };
}) => event as unknown as ObjectRecordEvent<Record<string, unknown>>;

export const makeFakeLeadStore = ({
  leads,
  stages,
  now,
  people = [],
  companies = [],
  teams = [],
  memberships = [],
  score,
}: {
  leads: LeadRow[];
  stages: StageRow[];
  now: string;
  people?: PartnerPersonRow[];
  companies?: PartnerCompanyRow[];
  teams?: TeamRow[];
  memberships?: MembershipRow[];
  score?: LeadContext['score'];
}) => {
  const rows = new Map(leads.map((row) => [row.id, row]));
  const writes: Write[] = [];
  const updateCalls: string[][] = [];
  const notes: { id: string; reason: string }[] = [];
  const destroyed: string[] = [];
  const moves: { lead: LeadRow; moves: StatusMoves }[] = [];
  const failOn = new Set<string>();
  const pushes: LeadPersonPush[] = [];
  const contacts = new Map(people.map((person) => [person.id, person]));
  const context: LeadContext = {
    stages,
    recurringPlanMonths: new Map(),
    teams,
    memberships,
    people: contacts,
    companies: new Map(companies.map((company) => [company.id, company])),
    ...(score === undefined ? {} : { score }),
  };

  const apply = (id: string, data: Record<string, unknown>) => {
    if (failOn.has(id)) {
      throw new Error(`write refused for ${id}`);
    }
    const before = rows.get(id);

    if (before === undefined) {
      throw new Error(`no lead ${id}`);
    }
    const after = { ...before, ...data, updatedBy: APP_ACTOR } as LeadRow;

    rows.set(id, after);
    writes.push({ id, before, after, fields: Object.keys(data) });
  };

  const readLeads = async (ids: string[]) => ids.flatMap((id) => (rows.has(id) ? [rows.get(id) as LeadRow] : []));

  const triggerApi: LeadTriggerApi = {
    now: () => now,
    readFields: leadSelectionFields({ withTeam: true }),
    readLeads,
    loadContext: async () => context,
    updateLead: async (id, data) => apply(id, data),
    putBackLead: async (id, data, reason) => {
      apply(id, data);
      notes.push({ id, reason });
    },
    destroyLead: async (id) => {
      rows.delete(id);
      destroyed.push(id);
    },
    pushPeople: async (batch) => {
      pushes.push(...batch);
    },
    applyStatusMoves: async (batch) => {
      moves.push(...batch);
    },
    memberLocale: async () => 'en',
    translate: (_locale, message) => message,
  };

  const writeApi: AppLeadWriteApi = {
    now: () => now,
    readLeads,
    loadContext: async () => context,
    updateLeads: async (ids, data) => {
      updateCalls.push(ids);
      ids.forEach((id) => apply(id, data));
    },
    updateLeadWhere: async (filter, data) => {
      const { id, ...guard } = filter as { id: { eq: string } } & Record<string, unknown>;
      const row = rows.get(id.eq);

      if (row === undefined || !matchesGuard(row, guard)) {
        return [];
      }
      apply(id.eq, data);
      return [id.eq];
    },
    applyStatusMoves: triggerApi.applyStatusMoves,
    pushPeople: triggerApi.pushPeople,
  };

  // The events the app's own writes raise, as the next trigger batch sees them.
  const takeAppWriteEvents = () =>
    writes.splice(0).map((write) =>
      leadEvent({ recordId: write.id, properties: { before: write.before, after: write.after, updatedFields: write.fields } }),
    );

  return { rows, writes, updateCalls, notes, destroyed, moves, failOn, pushes, contacts, triggerApi, writeApi, takeAppWriteEvents };
};
