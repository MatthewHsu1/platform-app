import { describe, expect, it } from 'vitest';

import { emptyConvertState, makeFakeConvertApi } from 'src/crm/lead/actions/__tests__/fakes/fake-convert-api';
import { makeConvertAndAllocate } from 'src/crm/lead/actions/make-convert-and-allocate';
import { type ConvertOptions } from 'src/crm/lead/actions/types/convert-options.type';
import { leadEvent, makeFakeLeadStore } from 'src/crm/lead/__tests__/fakes/fake-lead-store';
import { leadRow, stageRow } from 'src/crm/lead/merge/utils/__tests__/fixtures/lead-row.fixture';
import { makeRunLeadTrigger } from 'src/crm/lead/run-lead-trigger';
import { type LeadRow } from 'src/crm/lead/types/lead-row.type';
import { type MembershipRow } from 'src/sales-team/team/types/membership-row.type';
import { type TeamRow } from 'src/sales-team/team/types/team-row.type';
import { sameValue } from 'src/shared/utils/same-value.util';

const NOW = '2026-10-09T12:00:00.000Z';
const STAFF = { source: 'MANUAL', workspaceMemberId: 'admin' };

const team = (id: string, sequence: number): TeamRow => ({
  id,
  name: id,
  sequence,
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
});

const membership = (teamId: string, userId: string): MembershipRow => ({
  id: `${teamId}-${userId}`,
  teamId,
  userId,
  active: true,
  assignmentMax: 30,
  assignmentOptout: false,
  assignmentDomain: null,
  assignmentDomainPreferred: null,
  createdAt: '2026-01-01T00:00:00.000Z',
});

// The old salesperson belongs to Sales only, not to the lead's team A; the
// new one belongs to B, and a third one to A.
const TEAMS = [team('team-sales', 1), team('team-a', 2), team('team-b', 3)];
const MEMBERSHIPS = [membership('team-sales', 'old-rep'), membership('team-b', 'new-rep'), membership('team-a', 'a-rep')];
const STAGES = [
  stageRow({ id: 'a-1', sequence: 1, teamIds: ['team-a'] }),
  stageRow({ id: 'b-1', sequence: 2, teamIds: ['team-b'] }),
  stageRow({ id: 'sales-1', sequence: 3, teamIds: ['team-sales'] }),
  stageRow({ id: 'won', sequence: 70, isWon: true }),
];
const CONTACT = { id: 'contact-1', name: { firstName: 'Ann', lastName: 'Lee' }, emails: null, phones: null, jobTitle: null, companyId: null };

const options = (overrides: Partial<ConvertOptions>): ConvertOptions => ({
  customerAction: 'EXIST',
  personId: 'contact-1',
  companyId: null,
  salespersonIds: [],
  teamId: null,
  force: true,
  runId: 'run-1',
  ...overrides,
});

// Each save of the conversion raises the lead rules at once; they read the
// lead before the conversion's next save, and their writes land only after
// the conversion has finished. That is the slowest order Twenty can give.
const convertWithLateRules = async (lead: LeadRow, convertOptions: ConvertOptions) => {
  const store = makeFakeLeadStore({ leads: [lead], stages: STAGES, now: NOW, teams: TEAMS, memberships: MEMBERSHIPS });
  const late: { id: string; data: Record<string, unknown> }[] = [];
  const lateRules = makeRunLeadTrigger({ ...store.triggerApi, updateLead: async (id, data) => void late.push({ id, data }) });
  const convertState = emptyConvertState([lead]);

  convertState.people.push(CONTACT);
  const api = {
    ...makeFakeConvertApi(convertState),
    readStagesAndTeams: async () => ({ stages: STAGES, teams: TEAMS, memberships: MEMBERSHIPS }),
    updateLead: async (id: string, data: Record<string, unknown>) => {
      const before = store.rows.get(id) as LeadRow;
      const after = { ...before, ...data, updatedBy: STAFF } as LeadRow;
      const updatedFields = Object.keys(data).filter((field) => !sameValue(before[field as keyof LeadRow], after[field as keyof LeadRow]));

      store.rows.set(id, after);
      await lateRules({
        operation: 'updated',
        events: [leadEvent({ recordId: id, workspaceMemberId: 'admin', properties: { before, after, updatedFields } })],
      });
    },
  };

  await makeConvertAndAllocate(api)([lead], convertOptions);
  for (const write of late) {
    await store.triggerApi.updateLead(write.id, write.data);
  }

  const rules = makeRunLeadTrigger(store.triggerApi);

  for (let pass = 0; pass < 5 && store.writes.length > 0; pass += 1) {
    await rules({ operation: 'updated', events: store.takeAppWriteEvents() });
  }

  return store.rows.get(lead.id) as LeadRow;
};

const leadInTeamA = (stageId: string | null) =>
  leadRow({ id: 'lead-1', createdAt: '2026-02-01T00:00:00.000Z', name: 'Treadmills', teamId: 'team-a', stageId, salespersonId: 'old-rep', updatedBy: STAFF });

describe('convert one lead, with the lead rules running late', () => {
  it('ends in the chosen salesperson and team, in the first stage of that team, when the old salesperson is outside the old team', async () => {
    const converted = await convertWithLateRules(leadInTeamA('a-1'), options({ salespersonIds: ['new-rep'], teamId: 'team-b' }));

    expect([converted.leadType, converted.salespersonId, converted.teamId, converted.stageId]).toEqual(['OPPORTUNITY', 'new-rep', 'team-b', 'b-1']);
  });

  it('gives a lead with no stage the first stage of the chosen team, not one of its old team', async () => {
    const converted = await convertWithLateRules(leadInTeamA(null), options({ salespersonIds: ['new-rep'], teamId: 'team-b' }));

    expect([converted.salespersonId, converted.teamId, converted.stageId]).toEqual(['new-rep', 'team-b', 'b-1']);
  });

  it("moves a lead with no stage to the new salesperson's team and its first stage when no team is chosen", async () => {
    const converted = await convertWithLateRules(leadInTeamA(null), options({ salespersonIds: ['new-rep'] }));

    expect([converted.salespersonId, converted.teamId, converted.stageId]).toEqual(['new-rep', 'team-b', 'b-1']);
  });

  it('gives an opportunity with no stage the first stage of its team when the new salesperson keeps that team', async () => {
    const opportunity = { ...leadInTeamA(null), leadType: 'OPPORTUNITY' };
    const converted = await convertWithLateRules(opportunity, options({ salespersonIds: ['a-rep'] }));

    expect([converted.salespersonId, converted.teamId, converted.stageId]).toEqual(['a-rep', 'team-a', 'a-1']);
  });
});
