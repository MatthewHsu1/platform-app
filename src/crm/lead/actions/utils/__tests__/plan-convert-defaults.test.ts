import { describe, expect, it } from 'vitest';

import { planConvertDefaults } from 'src/crm/lead/actions/utils/plan-convert-defaults.util';
import { leadRow } from 'src/crm/lead/merge/utils/__tests__/fixtures/lead-row.fixture';
import { type PartnerPersonRow } from 'src/crm/lead/types/partner-person-row.type';
import { type MembershipRow } from 'src/sales-team/team/types/membership-row.type';
import { type TeamRow } from 'src/sales-team/team/types/team-row.type';

const team = (id: string, sequence: number, createdAt: string): TeamRow => ({
  id, name: id, sequence, createdAt, active: true, leaderId: null, useLeads: false, useOpportunities: true,
  assignmentOptout: false, assignmentMax: 0, assignmentDomain: null, color: null, seedKey: null,
});
const member = (teamId: string, userId: string): MembershipRow => ({
  id: `${teamId}-${userId}`, teamId, userId, active: true, assignmentMax: 30, assignmentOptout: false,
  assignmentDomain: null, assignmentDomainPreferred: null, createdAt: '2026-01-01T00:00:00.000Z',
});
const TEAMS = [team('team-1', 5, '2026-01-01T00:00:00.000Z'), team('team-convert', 10, '2026-01-02T00:00:00.000Z')];
const MEMBERSHIPS = [member('team-1', 'user-sales-leads'), member('team-convert', 'user-sales-salesman')];
const person = (id: string, companyId: string | null, email: string | null): PartnerPersonRow => ({
  id, name: { firstName: id, lastName: null }, emails: { primaryEmail: email, additionalEmails: null }, phones: null, jobTitle: null, companyId,
});

const lead1 = leadRow({
  id: 'lead-1',
  createdAt: '2026-02-01T00:00:00.000Z',
  salespersonId: 'user-sales-leads',
  teamId: 'team-1',
  emailFrom: { primaryEmail: 'amy.wong@test.example.com', additionalEmails: null },
});

describe('planConvertDefaults', () => {
  it('creates a customer when no contact matches, with the salesperson of the lead and their team', () => {
    expect(
      planConvertDefaults({ lead: lead1, leadPerson: null, personByEmail: null, chosenPerson: null, request: {}, teams: TEAMS, memberships: MEMBERSHIPS }),
    ).toEqual({
      customerAction: 'CREATE',
      personId: null,
      companyId: null,
      duplicateSearch: { email: 'amy.wong@test.example.com', personId: null, companyId: null },
      salespersonId: 'user-sales-leads',
      teamId: 'team-1',
    });
  });

  it('links the lead contact, whose email and company then drive the search and the company', () => {
    const contact = person('contact-1', 'company-1', 'contact@company.example');

    expect(
      planConvertDefaults({ lead: { ...lead1, personId: 'contact-1' }, leadPerson: contact, personByEmail: null, chosenPerson: null, request: {}, teams: TEAMS, memberships: MEMBERSHIPS }),
    ).toMatchObject({
      customerAction: 'EXIST',
      personId: 'contact-1',
      companyId: 'company-1',
      duplicateSearch: { email: 'contact@company.example', personId: 'contact-1' },
    });
  });

  it('links a person found by the lead email', () => {
    const found = person('by-email', null, 'amy.wong@test.example.com');

    expect(
      planConvertDefaults({ lead: lead1, leadPerson: null, personByEmail: found, chosenPerson: null, request: {}, teams: TEAMS, memberships: MEMBERSHIPS }),
    ).toMatchObject({ customerAction: 'EXIST', personId: 'by-email' });
  });

  it('links the company that is the lead customer and searches the duplicates by it, not by a contact holding the email', () => {
    const holder = person('holder', 'company-other', 'amy.wong@test.example.com');

    expect(
      planConvertDefaults({
        lead: { ...lead1, companyId: 'company-lead' }, leadPerson: null, personByEmail: holder, chosenPerson: null,
        request: {}, teams: TEAMS, memberships: MEMBERSHIPS,
      }),
    ).toMatchObject({
      customerAction: 'EXIST',
      personId: null,
      companyId: 'company-lead',
      duplicateSearch: { email: 'amy.wong@test.example.com', personId: null, companyId: 'company-lead' },
    });
  });

  it('searches the duplicates with the contact chosen in the dialog', () => {
    const chosen = person('chosen', 'company-2', 'chosen@x.example');

    expect(
      planConvertDefaults({
        lead: lead1, leadPerson: null, personByEmail: null, chosenPerson: chosen,
        request: { customerAction: 'EXIST', personId: 'chosen' }, teams: TEAMS, memberships: MEMBERSHIPS,
      }),
    ).toMatchObject({
      personId: 'chosen',
      companyId: 'company-2',
      duplicateSearch: { email: 'amy.wong@test.example.com', personId: 'chosen' },
    });
  });

  it('moves the team to the new salesperson\'s team when they are not in the chosen one', () => {
    expect(
      planConvertDefaults({
        lead: lead1, leadPerson: null, personByEmail: null, chosenPerson: null,
        request: { salespersonId: 'user-sales-salesman', teamId: 'team-1' }, teams: TEAMS, memberships: MEMBERSHIPS,
      }),
    ).toMatchObject({ salespersonId: 'user-sales-salesman', teamId: 'team-convert' });
  });

  it('leaves the team when the salesperson is cleared', () => {
    expect(
      planConvertDefaults({
        lead: lead1, leadPerson: null, personByEmail: null, chosenPerson: null,
        request: { salespersonId: null, teamId: 'team-convert' }, teams: TEAMS, memberships: MEMBERSHIPS,
      }),
    ).toMatchObject({ salespersonId: null, teamId: 'team-convert' });
  });

  it('opens with no team when the lead has no salesperson', () => {
    expect(
      planConvertDefaults({ lead: { ...lead1, salespersonId: null }, leadPerson: null, personByEmail: null, chosenPerson: null, request: {}, teams: TEAMS, memberships: MEMBERSHIPS }),
    ).toMatchObject({ salespersonId: null, teamId: null });
  });

  it('clears the contact when the user switches to creating a customer', () => {
    const contact = person('contact-1', 'company-1', null);

    expect(
      planConvertDefaults({
        lead: { ...lead1, personId: 'contact-1' }, leadPerson: contact, personByEmail: null, chosenPerson: null,
        request: { customerAction: 'CREATE' }, teams: TEAMS, memberships: MEMBERSHIPS,
      }),
    ).toMatchObject({ customerAction: 'CREATE', personId: null, companyId: null });
  });

  it('brings back the matching contact when the user switches back to linking', () => {
    const contact = person('contact-1', 'company-1', null);

    expect(
      planConvertDefaults({
        lead: { ...lead1, personId: 'contact-1' }, leadPerson: contact, personByEmail: null, chosenPerson: null,
        request: { customerAction: 'EXIST' }, teams: TEAMS, memberships: MEMBERSHIPS,
      }),
    ).toMatchObject({ customerAction: 'EXIST', personId: 'contact-1', companyId: 'company-1' });
  });
});
