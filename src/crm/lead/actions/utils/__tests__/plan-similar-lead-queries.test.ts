import { describe, expect, it } from 'vitest';

import { keepIfRelevant, planSimilarLeadQueries, similarCompanyFilter } from 'src/crm/lead/actions/utils/plan-similar-lead-queries.util';
import { leadRow } from 'src/crm/lead/merge/utils/__tests__/fixtures/lead-row.fixture';
import { type LeadRow } from 'src/crm/lead/types/lead-row.type';

const lead = (overrides: Partial<LeadRow> = {}) => leadRow({ id: 'lead-1', createdAt: '2026-02-01T00:00:00.000Z', ...overrides });

describe('planSimilarLeadQueries', () => {
  it('searches a company domain with the wildcards of the domain escaped', () => {
    const queries = planSimilarLeadQueries({
      lead: lead({ emailFrom: { primaryEmail: 'floppy@my_company.com', additionalEmails: null } }),
      person: null,
    });

    expect(queries.email).toEqual({
      and: [{ id: { neq: 'lead-1' } }, { emailFrom: { primaryEmail: { ilike: '%@my\\_company.com' } } }],
    });
  });

  it('searches the whole address of a free-mail provider, whatever its case', () => {
    expect(
      planSimilarLeadQueries({ lead: lead({ emailFrom: { primaryEmail: 'FP@gmail.com', additionalEmails: null } }), person: null }).email,
    ).toEqual({ and: [{ id: { neq: 'lead-1' } }, { emailFrom: { primaryEmail: { ilike: 'fp@gmail.com' } } }] });
  });

  it('has no email criterion without one valid address', () => {
    expect(planSimilarLeadQueries({ lead: lead(), person: null }).email).toBeNull();
    expect(
      planSimilarLeadQueries({ lead: lead({ emailFrom: { primaryEmail: 'not an address', additionalEmails: null } }), person: null }).email,
    ).toBeNull();
  });

  it("takes the contact's company as the commercial entity, else the contact, else the company", () => {
    expect(
      planSimilarLeadQueries({ lead: lead({ personId: 'dave', companyId: 'other' }), person: { id: 'dave', companyId: 'my-company' } })
        .commercial,
    ).toEqual({ kind: 'company', companyId: 'my-company' });
    expect(planSimilarLeadQueries({ lead: lead({ personId: 'solo' }), person: { id: 'solo', companyId: null } }).commercial).toEqual({
      kind: 'person',
      filter: { and: [{ id: { neq: 'lead-1' } }, { personId: { eq: 'solo' } }] },
    });
    expect(planSimilarLeadQueries({ lead: lead({ companyId: 'my-company' }), person: null }).commercial).toEqual({
      kind: 'company',
      companyId: 'my-company',
    });
    expect(planSimilarLeadQueries({ lead: lead(), person: null }).commercial).toBeNull();
  });

  it('searches the same calling code and national number', () => {
    expect(
      planSimilarLeadQueries({
        lead: lead({
          phone: { primaryPhoneNumber: '2025550123', primaryPhoneCountryCode: 'US', primaryPhoneCallingCode: '+1', additionalPhones: null },
        }),
        person: null,
      }).phone,
    ).toEqual({
      and: [{ id: { neq: 'lead-1' } }, { phone: { primaryPhoneNumber: { eq: '2025550123' }, primaryPhoneCallingCode: { eq: '+1' } } }],
    });
    expect(planSimilarLeadQueries({ lead: lead(), person: null }).phone).toBeNull();
  });

  it('has no phone criterion for a number that is not valid', () => {
    expect(
      planSimilarLeadQueries({
        lead: lead({
          phone: { primaryPhoneNumber: '1115550143', primaryPhoneCountryCode: 'US', primaryPhoneCallingCode: '+1', additionalPhones: null },
        }),
        person: null,
      }).phone,
    ).toBeNull();
  });
});

describe('similarCompanyFilter', () => {
  it("finds the leads of the company's people and the leads of the company with no contact", () => {
    expect(similarCompanyFilter({ leadId: 'lead-1', companyId: 'c', peopleIds: ['dave', 'eve'] })).toEqual({
      and: [
        { id: { neq: 'lead-1' } },
        { or: [{ personId: { in: ['dave', 'eve'] } }, { and: [{ personId: { is: 'NULL' } }, { companyId: { eq: 'c' } }] }] },
      ],
    });
  });
});

describe('keepIfRelevant', () => {
  it('drops a criterion that finds 21 leads or more', () => {
    expect(keepIfRelevant(Array.from({ length: 20 }, (_, index) => index))).toHaveLength(20);
    expect(keepIfRelevant(Array.from({ length: 21 }, (_, index) => index))).toEqual([]);
  });
});
