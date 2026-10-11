import { describe, expect, it } from 'vitest';

import { leadEvent, makeFakeLeadStore } from 'src/crm/lead/__tests__/fakes/fake-lead-store';
import { readLeadRow } from 'src/crm/lead/lead-selection';
import { makeRunLeadTrigger } from 'src/crm/lead/run-lead-trigger';
import { makeRunPersonTrigger } from 'src/crm/lead/run-partner-triggers';
import { type LeadPersonPush } from 'src/crm/lead/types/lead-person-push.type';
import { type LeadRow } from 'src/crm/lead/types/lead-row.type';
import { type PartnerPersonRow } from 'src/crm/lead/types/partner-person-row.type';
import { type StageRow } from 'src/crm/lead/types/stage-row.type';
import { makeWriteLeadsAsApplication } from 'src/crm/lead/write-leads-as-application';

const NOW = '2026-10-09T12:00:00.000Z';
const STAFF = { source: 'MANUAL', workspaceMemberId: 'm1' };
const ZERO = { amountMicros: 0, currencyCode: 'USD' };
const STAGES: StageRow[] = [
  { id: 'new', name: 'New', sequence: 1, isWon: false, fold: false, rottingThresholdDays: 0, createdAt: '2026-01-01T00:00:00.000Z', teamIds: [] },
];

const lead = (id: string, values: Record<string, unknown>): LeadRow =>
  readLeadRow({
    id,
    createdAt: '2026-09-01T09:00:00.000Z',
    name: `Lead ${id}`,
    leadType: 'OPPORTUNITY',
    wonStatus: 'PENDING',
    stageId: 'new',
    probability: 10,
    automatedProbability: 10,
    dateLastStageUpdate: '2026-09-01T09:00:00.000Z',
    updatedBy: STAFF,
    proratedRevenue: ZERO,
    recurringRevenueMonthly: ZERO,
    recurringRevenueMonthlyProrated: ZERO,
    recurringRevenueProrated: ZERO,
    personId: 'P',
    contactName: 'Amy Wong',
    emailState: 'CORRECT',
    ...values,
  });

const AMY: PartnerPersonRow = {
  id: 'P',
  name: { firstName: 'Amy', lastName: 'Wong' },
  emails: { primaryEmail: 'amy@test.example.com', additionalEmails: [] },
  phones: null,
  jobTitle: null,
  companyId: null,
};

// The lead trigger, the contact trigger and Platform's own lead writes over
// one in-memory workspace. Each write raises the event the next run gets, as
// Twenty's batches do, until no run writes anything.
const makeWorld = (leads: LeadRow[]) => {
  const store = makeFakeLeadStore({ leads, stages: STAGES, now: NOW, people: [AMY] });
  const personEvents: ReturnType<typeof leadEvent>[] = [];
  const deletedPeople = new Set<string>();
  let personWrites = 0;
  const leadWrites: { id: string; fields: string[] }[] = [];

  const pushPeople = async (batch: LeadPersonPush[]) => {
    for (const { push } of batch) {
      const before = store.contacts.get(push.personId) as PartnerPersonRow;
      const after: PartnerPersonRow = {
        ...before,
        emails: push.primaryEmail === undefined ? before.emails : { primaryEmail: push.primaryEmail, additionalEmails: [] },
        phones: push.phone ?? before.phones,
      };

      store.contacts.set(push.personId, after);
      personWrites += 1;
      personEvents.push(
        leadEvent({
          recordId: push.personId,
          properties: { before, after, updatedFields: [...(push.primaryEmail === undefined ? [] : ['emails']), ...(push.phone === undefined ? [] : ['phones'])] },
        }),
      );
    }
  };
  const writeApi = { ...store.writeApi, pushPeople };
  const runLeadTrigger = makeRunLeadTrigger({ ...store.triggerApi, pushPeople });
  const runPersonTrigger = makeRunPersonTrigger({
    readPeople: async (ids) => ids.flatMap((id) => (store.contacts.has(id) ? [store.contacts.get(id) as PartnerPersonRow] : [])),
    readLeadsOf: async (field, ids) => [...store.rows.values()].filter((row) => ids.includes(row[field] ?? '')),
    stillDeleted: async (_object, ids) => ids.filter((id) => deletedPeople.has(id)),
    writeLeads: makeWriteLeadsAsApplication(writeApi),
  });

  const takeLeadEvents = () => {
    const events = store.takeAppWriteEvents();

    leadWrites.push(...events.map((event) => ({ id: event.recordId, fields: (event.properties as { updatedFields: string[] }).updatedFields })));
    return events;
  };

  // Runs the queued batches until quiet; the number of rounds that still had work.
  const settle = async () => {
    for (let round = 0; round < 10; round += 1) {
      const leadBatch = takeLeadEvents();
      const personBatch = personEvents.splice(0);

      if (leadBatch.length === 0 && personBatch.length === 0) {
        return round;
      }
      if (leadBatch.length > 0) {
        await runLeadTrigger({ operation: 'updated', events: leadBatch });
      }
      if (personBatch.length > 0) {
        await runPersonTrigger({ operation: 'updated', events: personBatch });
      }
    }

    throw new Error('the triggers did not settle');
  };

  return { store, deletedPeople, settle, runLeadTrigger, runPersonTrigger, leadWrites, personWrites: () => personWrites };
};

describe('lead and contact sync across the triggers', () => {
  it('brings every lead of the contact to an email typed on one lead, then stops', async () => {
    const leadA = lead('A', { emailFrom: { primaryEmail: 'amy@test.example.com' } });
    const leadB = lead('B', { emailFrom: { primaryEmail: 'other@test.example.com' } });
    const world = makeWorld([leadA, leadB]);
    const edited = { ...leadA, emailFrom: { primaryEmail: 'john.zoidberg@test.example.com', additionalEmails: null } };

    const staffEdit = leadEvent({ recordId: 'A', workspaceMemberId: 'm1', properties: { before: leadA, after: edited, updatedFields: ['emailFrom'] } });

    world.store.rows.set('A', edited);
    await world.runLeadTrigger({ operation: 'updated', events: [staffEdit] });
    await world.settle();

    expect(world.store.contacts.get('P')?.emails?.primaryEmail).toBe('john.zoidberg@test.example.com');
    expect(world.store.rows.get('A')?.emailFrom?.primaryEmail).toBe('john.zoidberg@test.example.com');
    expect(world.store.rows.get('B')?.emailFrom?.primaryEmail).toBe('john.zoidberg@test.example.com');
    expect(world.personWrites()).toBe(1);
    expect(world.leadWrites).toEqual([{ id: 'B', fields: ['emailFrom'] }]);

    // The same batches delivered again find every value in place.
    await world.runLeadTrigger({ operation: 'updated', events: [staffEdit] });
    await world.runPersonTrigger({
      operation: 'updated',
      events: [leadEvent({ recordId: 'P', properties: { before: AMY, after: world.store.contacts.get('P'), updatedFields: ['emails'] } })],
    });

    expect(await world.settle()).toBe(0);
    expect(world.personWrites()).toBe(1);
    expect(world.leadWrites).toHaveLength(1);
  });

  it('clears a deleted contact from its leads and empties the contact name, then stops', async () => {
    const world = makeWorld([lead('A', {}), lead('B', {})]);

    world.deletedPeople.add('P');
    await world.runPersonTrigger({ operation: 'deleted', events: [leadEvent({ recordId: 'P', properties: { before: AMY, after: AMY } })] });
    await world.settle();

    expect(world.store.rows.get('A')).toMatchObject({ personId: null, contactName: null });
    expect(world.store.rows.get('B')).toMatchObject({ personId: null, contactName: null });
    expect(world.leadWrites.map((write) => write.id).sort()).toEqual(['A', 'B']);
  });
});
