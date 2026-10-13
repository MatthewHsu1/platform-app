import { describe, expect, it } from 'vitest';

import { leadRow, SAMPLE_STAGES } from 'src/crm/lead/merge/utils/__tests__/fixtures/lead-row.fixture';
import { planLeadMerge, sortForMerge } from 'src/crm/lead/merge/utils/plan-lead-merge.util';

const at = (second: number) => `2026-02-01T00:00:${String(second).padStart(2, '0')}.000Z`;

const sampleLeads = () => ({
  lead1: leadRow({
    id: 'lead-1',
    createdAt: at(1),
    name: 'Nibbler Spacecraft Request',
    leadType: 'OPPORTUNITY',
    probability: 50,
    stageId: 'team1-1',
    teamId: 'team-1',
    salespersonId: 'user-sales-leads',
    contactName: 'Amy Wong',
    emailFrom: { primaryEmail: 'amy.wong@test.example.com', additionalEmails: null },
    language: 'FR_FR',
    tags: ['TAG_0', 'TAG_1', 'TAG_2'],
    description: { markdown: 'lead_1' },
  }),
  withPartner: leadRow({
    id: 'lead-w-partner',
    createdAt: at(2),
    teamId: 'team-1',
    name: 'New1',
    probability: 0,
    lostReasonId: 'reason-test',
    personId: 'contact-1',
    description: { markdown: 'lead_w_partner' },
  }),
  withPartnerCompany: leadRow({
    id: 'lead-w-partner-company',
    createdAt: at(3),
    teamId: 'team-1',
    name: 'New1',
    leadType: 'OPPORTUNITY',
    probability: 50,
    stageId: 'team1-1',
    salespersonId: 'user-sales-manager',
    personId: 'contact-company-1',
    companyId: 'company-1',
    contactName: 'Hermes Conrad',
    emailFrom: { primaryEmail: 'hermes.conrad@test.example.com', additionalEmails: null },
    tags: ['TAG_0', 'TAG_1', 'TAG_3'],
  }),
  withContact: leadRow({
    id: 'lead-w-contact',
    createdAt: at(4),
    teamId: 'team-convert',
    name: 'LeadContact',
    probability: 25,
    stageId: 'gen-1',
    salespersonId: 'user-sales-salesman',
    contactName: 'TestContact',
    description: { markdown: 'lead_w_contact' },
  }),
  withEmail: leadRow({
    id: 'lead-w-email',
    createdAt: at(5),
    teamId: 'team-convert',
    name: 'LeadEmailAsContact',
    priority: 'HIGH',
    probability: 15,
    stageId: 'gen-1',
    salespersonId: 'user-sales-salesman',
    emailFrom: { primaryEmail: 'contact.email@test.example.com', additionalEmails: null },
    description: { markdown: 'lead_w_email' },
  }),
  emailLost: leadRow({
    id: 'lead-w-email-lost',
    createdAt: at(6),
    teamId: 'team-1',
    name: 'Lost',
    wonStatus: 'LOST',
    probability: 15,
    stageId: 'team1-2',
    emailFrom: { primaryEmail: 'strange.from@test.example.com', additionalEmails: null },
  }),
});

describe('sortForMerge', () => {
  it('puts opportunities first, then the higher stage, then the higher probability, the lost lead last', () => {
    const leads = sampleLeads();

    expect(sortForMerge(Object.values(leads), SAMPLE_STAGES).map((lead) => lead.id)).toEqual([
      'lead-1',
      'lead-w-partner-company',
      'lead-w-contact',
      'lead-w-email',
      'lead-w-partner',
      'lead-w-email-lost',
    ]);
  });

  it('takes the older lead first on a full tie', () => {
    const older = leadRow({ id: 'b-older', createdAt: at(1), leadType: 'OPPORTUNITY', probability: 50, stageId: 'team1-1' });
    const newer = leadRow({ id: 'a-newer', createdAt: at(9), leadType: 'OPPORTUNITY', probability: 50, stageId: 'team1-1' });

    expect(sortForMerge([newer, older], SAMPLE_STAGES).map((lead) => lead.id)).toEqual(['b-older', 'a-newer']);
  });

  it('ranks a lost opportunity above a pending lead', () => {
    const lostOpportunity = leadRow({ id: 'lost-opportunity', createdAt: at(2), leadType: 'OPPORTUNITY', wonStatus: 'LOST' });
    const pendingLead = leadRow({ id: 'pending-lead', createdAt: at(1), stageId: 'gen-1', probability: 90 });

    expect(sortForMerge([pendingLead, lostOpportunity], SAMPLE_STAGES)[0].id).toBe('lost-opportunity');
  });
});

describe('planLeadMerge', () => {
  it('keeps the head, takes the first value set per field, the highest priority, every tag, and no lost reason while the head has a probability', () => {
    const leads = sampleLeads();
    const plan = planLeadMerge({ leads: Object.values(leads), stages: SAMPLE_STAGES });

    expect(plan.headId).toBe('lead-1');
    expect(plan.tailIds).toEqual(['lead-w-partner-company', 'lead-w-contact', 'lead-w-email', 'lead-w-partner', 'lead-w-email-lost']);
    expect(plan.data).toMatchObject({
      name: 'Nibbler Spacecraft Request',
      personId: 'contact-company-1',
      companyId: 'company-1',
      priority: 'HIGH',
      lostReasonId: null,
      tags: ['TAG_0', 'TAG_1', 'TAG_2', 'TAG_3'],
      leadType: 'OPPORTUNITY',
      contactName: 'Amy Wong',
      emailFrom: { primaryEmail: 'amy.wong@test.example.com', additionalEmails: null },
      stageId: 'team1-1',
      description: { markdown: 'lead_1\n\nlead_w_contact\n\nlead_w_email\n\nlead_w_partner' },
    });
  });

  it('writes every merged field, without the salesperson and team when they equal the head and never the status, probabilities or dates', () => {
    const plan = planLeadMerge({ leads: Object.values(sampleLeads()), stages: SAMPLE_STAGES });

    expect(Object.keys(plan.data).sort()).toEqual(
      [
        'campaignId',
        'mediumId',
        'sourceId',
        'name',
        'language',
        'referred',
        'stageId',
        'expectedRevenue',
        'recurringPlanId',
        'recurringRevenue',
        'dateDeadline',
        'partnerName',
        'contactName',
        'emailFrom',
        'jobPosition',
        'phone',
        'website',
        'personId',
        'companyId',
        'description',
        'leadType',
        'priority',
        'tags',
        'lostReasonId',
        'contactAddress',
      ].sort(),
    );
  });

  it('leaves tags and language out of the write when no merged lead has one', () => {
    const leads = Object.values(sampleLeads()).map((lead) => ({ ...lead, tags: null, language: null }));
    const plan = planLeadMerge({ leads, stages: SAMPLE_STAGES });

    expect(Object.keys(plan.data)).not.toContain('tags');
    expect(Object.keys(plan.data)).not.toContain('language');
  });

  it('carries the first lost reason when every lead is at 0 %', () => {
    const leads = Object.values(sampleLeads()).map((lead) => ({ ...lead, probability: 0, automatedProbability: 50 }));
    const plan = planLeadMerge({ leads, stages: SAMPLE_STAGES });

    expect(plan.data.lostReasonId).toBe('reason-test');
  });

  it('takes the customer as one value from the first lead that has a contact or a customer', () => {
    const companyOnly = leadRow({ id: 'company-only', createdAt: at(1), leadType: 'OPPORTUNITY', companyId: 'company-9' });
    const personOnly = leadRow({ id: 'person-only', createdAt: at(2), personId: 'person-7' });
    const plan = planLeadMerge({ leads: [companyOnly, personOnly], stages: SAMPLE_STAGES });

    expect(plan.data).toMatchObject({ personId: null, companyId: 'company-9' });
  });

  it('takes the whole address from the best-ranked lead when every lead has as many parts', () => {
    const address = (street: string, city: string, postcode: string, country: string | null, state: string | null) => ({
      addressStreet1: street,
      addressStreet2: `${street}2`,
      addressCity: city,
      addressPostcode: postcode,
      addressState: state,
      addressCountry: country,
    });
    const leads = sampleLeads();
    const initial = address('Test street', 'Test City', '5000', 'Belgium', null);
    const other = address('Other street', 'Other City', '6666', null, 'Alabama');
    const all = Object.values(leads).map((lead) => ({
      ...lead,
      contactAddress: lead.id === 'lead-w-contact' ? initial : other,
      leadType: 'LEAD',
      probability: lead.id === 'lead-w-contact' ? 25 : lead.probability === 50 ? 10 : lead.probability,
    }));
    const plan = planLeadMerge({ leads: all, stages: SAMPLE_STAGES });

    expect(plan.headId).toBe('lead-w-contact');
    expect(plan.data.contactAddress).toEqual(initial);
  });

  it('takes the whole address from the lead with the most filled parts, the better-ranked one on a tie', () => {
    const only = (street: string, city: string | null) => ({
      addressStreet1: street,
      addressStreet2: null,
      addressCity: city,
      addressPostcode: null,
      addressState: null,
      addressCountry: null,
    });
    const leads = Object.values(sampleLeads()).map((lead) => ({
      ...lead,
      leadType: 'LEAD',
      contactAddress:
        lead.id === 'lead-w-partner'
          ? only('New street', 'New City')
          : lead.id === 'lead-w-email-lost'
            ? only('Other street', 'Other City')
            : only('Original street', null),
    }));
    const plan = planLeadMerge({ leads, stages: SAMPLE_STAGES });

    expect(plan.data.contactAddress).toEqual(only('New street', 'New City'));
  });

  it('keeps a stage for every team when a team is forced', () => {
    const leads = sampleLeads();
    const plan = planLeadMerge({
      leads: [leads.withContact, leads.withEmail, leads.lead1, leads.withPartner, leads.emailLost].map((lead) => ({
        ...lead,
        leadType: 'LEAD',
        probability: lead.id === 'lead-1' ? 20 : lead.probability,
      })),
      stages: SAMPLE_STAGES,
      salespersonId: 'user-sales-leads-convert',
      teamId: 'team-convert',
    });

    expect(plan.headId).toBe('lead-w-contact');
    expect({ ...leads.withContact, ...plan.data }).toMatchObject({
      salespersonId: 'user-sales-leads-convert',
      teamId: 'team-convert',
      stageId: 'gen-1',
      leadType: 'LEAD',
      description: { markdown: 'lead_w_contact\n\nlead_w_email\n\nlead_1\n\nlead_w_partner' },
    });
  });

  it('moves the stage to the first stage of a forced team when the merged stage belongs to another team', () => {
    const leads = sampleLeads();
    const lead1 = { ...leads.lead1, probability: 60 };
    const plan = planLeadMerge({
      leads: [lead1, leads.withPartnerCompany, leads.withContact, leads.withEmail, leads.withPartner],
      stages: SAMPLE_STAGES,
      teamId: 'team-convert',
    });

    expect(plan.headId).toBe('lead-1');
    expect(plan.data).toMatchObject({ teamId: 'team-convert', stageId: 'convert-1', leadType: 'OPPORTUNITY' });
  });

  it('skips an amount of 0 for the next amount set', () => {
    const zero = leadRow({ id: 'zero', createdAt: at(1), leadType: 'OPPORTUNITY', expectedRevenue: { amountMicros: 0, currencyCode: 'USD' } });
    const some = leadRow({ id: 'some', createdAt: at(2), expectedRevenue: { amountMicros: 1_500_000_000, currencyCode: 'USD' } });

    expect(planLeadMerge({ leads: [zero, some], stages: SAMPLE_STAGES }).data.expectedRevenue).toEqual({
      amountMicros: 1_500_000_000,
      currencyCode: 'USD',
    });
  });

  it('counts a text of spaces as a value', () => {
    const spaces = leadRow({ id: 'spaces', createdAt: at(1), leadType: 'OPPORTUNITY', referred: '  ' });
    const named = leadRow({ id: 'named', createdAt: at(2), referred: 'Hermes' });

    expect(planLeadMerge({ leads: [spaces, named], stages: SAMPLE_STAGES }).data.referred).toBe('  ');
  });

  it('keeps the joined text a stopped merge left on a lead, even when another lead now ranks first', () => {
    const first = leadRow({ id: 'first', createdAt: at(1), leadType: 'OPPORTUNITY', probability: 80, description: { markdown: 'Budget 20k' } });
    const joined = leadRow({ id: 'joined', createdAt: at(2), leadType: 'OPPORTUNITY', probability: 40, description: { markdown: 'Wants 12 treadmills\n\nBudget 20k\n\nDelivery in March' } });
    const last = leadRow({ id: 'last', createdAt: at(3), description: { markdown: 'Delivery in March' } });

    expect(planLeadMerge({ leads: [first, joined, last], stages: SAMPLE_STAGES }).data.description).toEqual({
      markdown: 'Wants 12 treadmills\n\nBudget 20k\n\nDelivery in March',
    });
  });

  it('keeps one copy of a text two leads share, and a text that only starts like another one', () => {
    const head = leadRow({ id: 'head', createdAt: at(1), leadType: 'OPPORTUNITY', description: { markdown: 'Call back' } });
    const same = leadRow({ id: 'same', createdAt: at(2), description: { markdown: 'Call back' } });
    const longer = leadRow({ id: 'longer', createdAt: at(3), description: { markdown: 'Call back on Monday' } });

    expect(planLeadMerge({ leads: [head, same, longer], stages: SAMPLE_STAGES }).data.description).toEqual({
      markdown: 'Call back\n\nCall back on Monday',
    });
  });
});
