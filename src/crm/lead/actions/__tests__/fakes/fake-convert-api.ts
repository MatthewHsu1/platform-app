import { type ConvertApi } from 'src/crm/lead/actions/types/convert-api.type';
import { SAMPLE_STAGES } from 'src/crm/lead/merge/utils/__tests__/fixtures/lead-row.fixture';
import { type AddressValue } from 'src/crm/lead/types/address-value.type';
import { type LeadRow } from 'src/crm/lead/types/lead-row.type';
import { type PartnerPersonRow } from 'src/crm/lead/types/partner-person-row.type';
import { normalizeDomain } from 'src/shared/utils/normalize-domain.util';

type FakeConvertState = {
  leads: Map<string, LeadRow>;
  people: PartnerPersonRow[];
  // `hidden`: in the trash, or one the user's role hides; its website still counts as taken.
  companies: { id: string; name: string; website: string | null; address?: AddressValue | null; hidden?: boolean }[];
  notes: { id: string; objectSingular: string; recordId: string; title: string; body: string }[];
  leadWrites: { leadId: string; data: Record<string, unknown> }[];
  // What the clicking user may create and change; everything when left out.
  updatable?: ('crmLead' | 'person' | 'company')[];
};

type Step = 'createCompany' | 'createPerson' | 'addNote' | 'updateLead';

export const emptyConvertState = (leads: LeadRow[] = []): FakeConvertState => ({
  leads: new Map(leads.map((lead) => [lead.id, lead])),
  people: [],
  companies: [],
  notes: [],
  leadWrites: [],
});

// A store in memory. `failAt` makes the named call throw once, as a run cut
// by its timeout would stop there.
export const makeFakeConvertApi = (state: FakeConvertState, failAt: { step: Step | null } = { step: null }): ConvertApi => {
  const step = (name: Step) => {
    if (failAt.step === name) {
      failAt.step = null;
      throw new Error(`stopped at ${name}`);
    }
  };

  return {
    updatableObjects: async () => new Set(state.updatable ?? ['crmLead', 'person', 'company']),
    readStagesAndTeams: async () => ({ stages: SAMPLE_STAGES, teams: [], memberships: [] }),
    readPerson: async (personId) => state.people.find((person) => person.id === personId) ?? null,
    findPersonByEmail: async (email) => state.people.find((person) => person.emails?.primaryEmail === email) ?? null,
    findCompanyIdByExactName: async (name) => state.companies.find((company) => company.hidden !== true && company.name === name)?.id ?? null,
    findCompanyIdByWebsite: async (domain) =>
      state.companies.find((company) => company.hidden !== true && company.website !== null && normalizeDomain(company.website) === domain)?.id ?? null,
    readCompanyAddress: async (companyId) => state.companies.find((company) => company.id === companyId)?.address ?? null,
    recordExists: async (objectSingular, id) =>
      objectSingular === 'person' ? state.people.some((person) => person.id === id) : state.companies.some((company) => company.id === id),
    createCompany: async (id, input) => {
      step('createCompany');
      const website = input.domainName?.primaryLinkUrl ?? null;

      if (website !== null && state.companies.some((company) => company.website !== null && normalizeDomain(company.website) === normalizeDomain(website))) {
        return 'taken';
      }
      state.companies.push({ id, name: input.name, website, address: input.address ?? null });

      return 'created';
    },
    createPerson: async (id, input) => {
      step('createPerson');
      const email = input.emails?.primaryEmail ?? null;

      if (email !== null && state.people.some((person) => person.emails?.primaryEmail === email)) {
        return 'taken';
      }
      state.people.push({
        id,
        name: input.name,
        emails: { primaryEmail: email, additionalEmails: null },
        phones: null,
        jobTitle: input.jobTitle ?? null,
        companyId: input.companyId,
      });

      return 'created';
    },
    addNote: async (note) => {
      step('addNote');
      if (!state.notes.some((stored) => stored.id === note.id)) {
        state.notes.push(note);
      }
    },
    updateLead: async (leadId, data) => {
      step('updateLead');
      state.leadWrites.push({ leadId, data });
      const lead = state.leads.get(leadId);

      if (lead !== undefined) {
        state.leads.set(leadId, { ...lead, ...data });
      }
    },
    readLocale: async () => 'en',
    now: () => '2026-10-09T12:00:00.000Z',
  };
};
