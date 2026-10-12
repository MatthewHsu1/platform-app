import { type AssignmentApi } from 'src/crm/assignment/types/assignment-api.type';
import { type AssignmentMembership } from 'src/crm/assignment/types/assignment-membership.type';
import { type LeadRow } from 'src/crm/lead/types/lead-row.type';
import { type StageRow } from 'src/crm/lead/types/stage-row.type';
import { type TeamRow } from 'src/sales-team/team/types/team-row.type';
import { FilterError } from 'src/shared/filter-editor/to-twenty-filter';

import { matchesTwentyFilter } from 'src/crm/assignment/__tests__/fakes/matches-twenty-filter';

export const NOW = new Date('2026-10-09T12:00:00.000Z');

export const makeLead = (id: string, values: Partial<LeadRow> = {}): LeadRow =>
  ({
    id,
    createdAt: '2026-10-08T00:00:00.000Z',
    deletedAt: null,
    name: id,
    leadType: 'LEAD',
    wonStatus: 'PENDING',
    priority: 'LOW',
    stageId: 'new',
    teamId: null,
    salespersonId: null,
    probability: 0,
    dateOpen: null,
    emailFrom: { primaryEmail: null, additionalEmails: null },
    ...values,
  }) as LeadRow;

export const makeTeam = (id: string, values: Partial<TeamRow> = {}): TeamRow => ({
  id,
  name: id,
  sequence: 10,
  createdAt: '2026-01-01T00:00:00.000Z',
  active: true,
  leaderId: null,
  useLeads: true,
  useOpportunities: true,
  assignmentOptout: false,
  assignmentMax: 0,
  assignmentDomain: null,
  color: null,
  seedKey: null,
  ...values,
});

export const makeMember = (id: string, teamId: string, userId: string, assignmentMax: number, values: Partial<AssignmentMembership> = {}): AssignmentMembership => ({
  id,
  teamId,
  userId,
  active: true,
  assignmentMax,
  assignmentOptout: false,
  assignmentDomain: null,
  assignmentDomainPreferred: null,
  createdAt: '2026-01-01T00:00:00.000Z',
  name: userId,
  ...values,
});

const STAGES: StageRow[] = [
  { id: 'new', name: 'New', sequence: 1, isWon: false, fold: false, rottingThresholdDays: 0, createdAt: '2026-01-01T00:00:00.000Z', teamIds: [] },
];

const cycle = (values: number[]) => {
  let index = 0;

  return () => values[index++ % values.length];
};

type FakeAssignmentApi = AssignmentApi & {
  leads: Map<string, LeadRow>;
  writes: { leadId: string; data: Record<string, unknown> }[];
  teamWrites: { leadId: string; teamId: string }[];
  merges: string[][];
  notes: { teamId: string; body: string }[];
  beforeWrite?: (leadId: string) => void;
  failAfterWrites?: number;
};

export const makeFakeAssignmentApi = ({
  leads,
  teams,
  memberships,
  random = [0.5],
  filters = {},
  duplicates = {},
  now = NOW,
}: {
  leads: LeadRow[];
  teams: TeamRow[];
  memberships: AssignmentMembership[];
  random?: number[];
  filters?: Record<string, Record<string, unknown> | 'broken' | Error>;
  duplicates?: Record<string, string[]>;
  now?: Date;
}): FakeAssignmentApi => {
  const store = new Map(leads.map((lead) => [lead.id, { ...lead }]));
  const fake: FakeAssignmentApi = {
    leads: store,
    writes: [],
    teamWrites: [],
    merges: [],
    notes: [],
    now: () => now,
    random: cycle(random),
    readTeams: async (teamIds) => teams.filter((team) => teamIds.includes(team.id)),
    readMemberships: async (teamIds) => memberships.filter((member) => member.active && teamIds.includes(member.teamId)),
    readStages: async () => STAGES,
    readDelayHours: async () => 0,
    translateFilter: async (text) => {
      if (text === null) {
        return null;
      }
      const filter = filters[text];

      if (filter instanceof Error) {
        throw filter;
      }
      if (filter === 'broken') {
        throw new FilterError('unknownField', { field: text });
      }
      if (filter === undefined) {
        throw new Error(`The test gives no filter for ${text}`);
      }
      return filter;
    },
    // As the real read: tags and language come back empty unless asked for.
    findLeads: async (filter, options) =>
      [...store.values()]
        .filter((lead) => matchesTwentyFilter(filter, lead as unknown as Record<string, unknown>))
        .map((lead) => (options?.withTagsAndLanguage === true ? lead : { ...lead, tags: null, language: null })),
    countLeadDays: async ({ teamIds, userIds, since }) => {
      const counts = new Map<string, number>();

      for (const lead of store.values()) {
        if (lead.dateOpen !== null && lead.dateOpen >= since.toISOString() && teamIds.includes(lead.teamId ?? '') && userIds.includes(lead.salespersonId ?? '')) {
          const key = `${lead.salespersonId}|${lead.teamId}`;

          counts.set(key, (counts.get(key) ?? 0) + 1);
        }
      }
      return counts;
    },
    findDuplicateIds: async (lead) => (duplicates[lead.id] ?? []).filter((id) => store.get(id)?.wonStatus === 'PENDING'),
    writeTeam: async (leadId, teamId) => {
      fake.beforeWrite?.(leadId);
      const lead = store.get(leadId);

      if (lead === undefined || lead.teamId !== null || lead.salespersonId !== null) {
        return false;
      }
      fake.teamWrites.push({ leadId, teamId });
      store.set(leadId, { ...lead, teamId });
      return true;
    },
    mergeLeads: async (leadIds) => {
      fake.merges.push(leadIds);
      const rows = leadIds.map((id) => store.get(id)).filter((row): row is LeadRow => row !== undefined);
      const head = rows.find((row) => row.leadType === 'OPPORTUNITY') ?? rows[0];
      const tailIds = rows.filter((row) => row.id !== head.id).map((row) => row.id);

      tailIds.forEach((id) => store.delete(id));
      return { headId: head.id, tailIds };
    },
    writeAssignment: async (leadId, data) => {
      fake.beforeWrite?.(leadId);
      if (fake.failAfterWrites !== undefined && fake.writes.length >= fake.failAfterWrites) {
        throw new Error('The run was stopped');
      }
      const lead = store.get(leadId);

      if (lead === undefined || lead.salespersonId !== null) {
        return false;
      }
      fake.writes.push({ leadId, data });
      store.set(leadId, { ...lead, ...(data as Partial<LeadRow>) });
      return true;
    },
    addTeamNote: async (teamId, body) => {
      fake.notes.push({ teamId, body });
    },
    translateMessage: (message, values = {}) =>
      Object.entries(values).reduce((text, [key, value]) => text.replace(`{${key}}`, String(value)), message),
    readPlugConfig: async () => null,
    callAssignmentPlug: async () => {
      throw new Error('No plug expected');
    },
    writePlugAssignments: async (writes) => {
      const written: string[] = [];

      for (const { leadId, data } of writes) {
        const lead = store.get(leadId);

        if (lead !== undefined && lead.salespersonId === null) {
          store.set(leadId, { ...lead, ...(data as Partial<LeadRow>) });
          written.push(leadId);
        }
      }
      return written;
    },
  };

  return fake;
};
