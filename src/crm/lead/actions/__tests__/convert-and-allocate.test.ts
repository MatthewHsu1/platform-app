import { describe, expect, it } from 'vitest';

import { emptyConvertState, makeFakeConvertApi } from 'src/crm/lead/actions/__tests__/fakes/fake-convert-api';
import { makeConvertAndAllocate } from 'src/crm/lead/actions/make-convert-and-allocate';
import { type ConvertOptions } from 'src/crm/lead/actions/types/convert-options.type';
import { leadRow } from 'src/crm/lead/merge/utils/__tests__/fixtures/lead-row.fixture';
import { type LeadRow } from 'src/crm/lead/types/lead-row.type';

const NOW = '2026-10-09T12:00:00.000Z';

const options = (overrides: Partial<ConvertOptions> = {}): ConvertOptions => ({
  customerAction: 'CREATE',
  personId: null,
  companyId: null,
  salespersonIds: [],
  teamId: null,
  force: false,
  runId: 'run-1',
  ...overrides,
});

const northside = leadRow({
  id: 'lead-1',
  createdAt: '2026-02-01T00:00:00.000Z',
  name: 'Treadmills',
  contactName: 'Jane Doe',
  partnerName: 'Northside Fitness',
  teamId: 'team-1',
  description: { markdown: 'Wants 12 treadmills' },
  emailFrom: { primaryEmail: 'jane@northside.example', additionalEmails: null },
  website: { primaryLinkUrl: 'https://northside.example', primaryLinkLabel: null, secondaryLinks: null },
});

describe('convertAndAllocate', () => {
  it('creates the company and the contact, notes the lead text on both, converts, then assigns', async () => {
    const state = emptyConvertState([northside]);

    await makeConvertAndAllocate(makeFakeConvertApi(state))([northside], options({ salespersonIds: ['user-1'], teamId: 'team-1', force: true }));

    const [company] = state.companies;
    const [person] = state.people;

    expect(state.companies.map((row) => row.name)).toEqual(['Northside Fitness']);
    expect(state.people.map((row) => [row.name, row.companyId])).toEqual([[{ firstName: 'Jane', lastName: 'Doe' }, company.id]]);
    expect(state.notes.map((note) => [note.objectSingular, note.recordId, note.title, note.body])).toEqual([
      ['company', company.id, 'Notes from the lead Treadmills', 'Wants 12 treadmills'],
      ['person', person.id, 'Notes from the lead Treadmills', 'Wants 12 treadmills'],
    ]);
    expect(state.leadWrites).toEqual([
      {
        leadId: 'lead-1',
        data: { leadType: 'OPPORTUNITY', dateConversion: NOW, personId: person.id, companyId: company.id, stageId: 'team1-1' },
      },
      { leadId: 'lead-1', data: { salespersonId: 'user-1', teamId: 'team-1' } },
    ]);
  });

  it('reuses the company with the same name', async () => {
    const state = { ...emptyConvertState([northside]), companies: [{ id: 'company-9', name: 'Northside Fitness', website: null }] };

    await makeConvertAndAllocate(makeFakeConvertApi(state))([northside], options());

    expect(state.companies).toHaveLength(1);
    expect(state.people[0].companyId).toBe('company-9');
  });

  it('leaves the email off a new contact when another contact holds it, and says so on the lead', async () => {
    const state = emptyConvertState([northside]);

    state.people.push({
      id: 'other',
      name: { firstName: 'Other', lastName: '' },
      emails: { primaryEmail: 'jane@northside.example', additionalEmails: null },
      phones: null,
      jobTitle: null,
      companyId: null,
    });

    await makeConvertAndAllocate(makeFakeConvertApi(state))([northside], options());

    expect(state.people.map((row) => row.emails?.primaryEmail ?? null)).toEqual(['jane@northside.example', null]);
    expect(state.notes.filter((note) => note.objectSingular === 'crmLead').map((note) => [note.recordId, note.title, note.body])).toEqual([
      ['lead-1', 'Contact created without email', 'Another contact already uses jane@northside.example, so the new contact was made without it.'],
    ]);
  });

  it('leaves the website off a new company when another company holds it, and says so on the lead', async () => {
    const state = { ...emptyConvertState([northside]), companies: [{ id: 'other', name: 'Northside Gyms', website: 'https://northside.example' }] };

    await makeConvertAndAllocate(makeFakeConvertApi(state))([northside], options());

    expect(state.companies.map((row) => [row.name, row.website])).toEqual([
      ['Northside Gyms', 'https://northside.example'],
      ['Northside Fitness', null],
    ]);
    expect(state.notes.filter((note) => note.objectSingular === 'crmLead').map((note) => note.title)).toEqual([
      'Company created without website',
    ]);
  });

  it('links a chosen contact and takes its company', async () => {
    const lead = leadRow({ id: 'l', createdAt: '2026-02-01T00:00:00.000Z', stageId: 'gen-1' });
    const state = emptyConvertState([lead]);

    state.people.push({ id: 'contact-1', name: { firstName: 'Ann', lastName: 'Lee' }, emails: null, phones: null, jobTitle: null, companyId: 'company-1' });

    await makeConvertAndAllocate(makeFakeConvertApi(state))([lead], options({ customerAction: 'EXIST', personId: 'contact-1' }));

    expect(state.leadWrites).toEqual([
      { leadId: 'l', data: { leadType: 'OPPORTUNITY', dateConversion: NOW, personId: 'contact-1', companyId: 'company-1' } },
    ]);
  });

  it('gives a lost lead neither a customer nor a salesperson, and a won lead a salesperson only', async () => {
    const lost = leadRow({ id: 'lost', createdAt: '2026-02-01T00:00:01.000Z', wonStatus: 'LOST', contactName: 'X Y' });
    const won = leadRow({ id: 'won', createdAt: '2026-02-01T00:00:02.000Z', wonStatus: 'WON', stageId: 'gen-won', personId: 'p', probability: 100 });
    const state = emptyConvertState([lost, won]);

    await makeConvertAndAllocate(makeFakeConvertApi(state))([lost, won], options({ salespersonIds: ['S1'], force: true }));

    expect(state.people).toEqual([]);
    expect(state.leadWrites).toEqual([{ leadId: 'won', data: { salespersonId: 'S1' } }]);
  });

  it('links each lead to the contact holding its email when converting many, and creates the rest', async () => {
    const first = leadRow({ id: 'a', createdAt: '2026-02-01T00:00:01.000Z', stageId: 'gen-1', emailFrom: { primaryEmail: 'known@x.example', additionalEmails: null } });
    const second = leadRow({ id: 'b', createdAt: '2026-02-01T00:00:02.000Z', stageId: 'gen-1', contactName: 'New Person' });
    const state = emptyConvertState([first, second]);

    state.people.push({ id: 'known', name: { firstName: 'Known', lastName: '' }, emails: { primaryEmail: 'known@x.example', additionalEmails: null }, phones: null, jobTitle: null, companyId: null });

    await makeConvertAndAllocate(makeFakeConvertApi(state))([first, second], options({ customerAction: 'EACH_EXIST_OR_CREATE' }));

    expect(state.leadWrites.map((write) => [write.leadId, write.data.personId])).toEqual([
      ['a', 'known'],
      ['b', state.people[1].id],
    ]);
  });

  it('refuses before any change when the user may not create companies and the lead needs one', async () => {
    const state = { ...emptyConvertState([northside]), updatable: ['crmLead', 'person'] as ('crmLead' | 'person' | 'company')[] };

    await expect(makeConvertAndAllocate(makeFakeConvertApi(state))([northside], options())).rejects.toThrow('Your role does not allow this.');
    expect([state.companies, state.people, state.notes, state.leadWrites]).toEqual([[], [], [], []]);
  });

  it.each(['createCompany', 'createPerson', 'addNote', 'updateLead'] as const)(
    'finishes the job without doubling anything when started again after stopping at %s',
    async (stopAt) => {
      const state = emptyConvertState([northside]);
      const failAt: { step: typeof stopAt | null } = { step: stopAt };
      const convert = makeConvertAndAllocate(makeFakeConvertApi(state, failAt));
      const run = async () => convert([state.leads.get('lead-1') as LeadRow], options({ salespersonIds: ['user-1'], force: true }));

      await expect(run()).rejects.toThrow(`stopped at ${stopAt}`);
      await run();

      const [company] = state.companies;
      const [person] = state.people;

      expect(state.companies).toHaveLength(1);
      expect(state.people).toHaveLength(1);
      expect(state.notes.map((note) => note.objectSingular)).toEqual(['company', 'person']);
      expect(state.leads.get('lead-1')).toMatchObject({
        leadType: 'OPPORTUNITY',
        dateConversion: NOW,
        personId: person.id,
        companyId: company.id,
        stageId: 'team1-1',
        salespersonId: 'user-1',
      });
    },
  );
});

describe('convertAndAllocate started again from a new dialog', () => {
  it('finds the contact the stopped run made instead of making a second one', async () => {
    const state = emptyConvertState([northside]);
    const failAt: { step: 'updateLead' | null } = { step: 'updateLead' };
    const convert = makeConvertAndAllocate(makeFakeConvertApi(state, failAt));

    await expect(convert([northside], options({ runId: 'first-dialog' }))).rejects.toThrow('stopped at updateLead');
    await convert([state.leads.get('lead-1') as LeadRow], options({ runId: 'second-dialog' }));

    expect(state.people).toHaveLength(1);
    expect(state.companies).toHaveLength(1);
    expect(state.leads.get('lead-1')).toMatchObject({ personId: state.people[0].id, companyId: state.companies[0].id });
  });
});
