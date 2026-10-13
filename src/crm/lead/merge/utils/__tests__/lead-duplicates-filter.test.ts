import { describe, expect, it } from 'vitest';

import { leadDuplicatesFilter } from 'src/crm/lead/merge/utils/lead-duplicates-filter.util';

const INCLUDING_LOST = [
  { wonStatus: { neq: 'WON' } },
  { or: [{ leadType: { eq: 'OPPORTUNITY' } }, { wonStatus: { neq: 'LOST' } }] },
];

describe('leadDuplicatesFilter', () => {
  it('matches the normalised email or the contact, and lets lost opportunities in when asked', () => {
    expect(
      leadDuplicatesFilter({ email: 'Amy Wong <Amy.Wong@Test.Example.com>', personId: 'person-1', companyId: null, includeLost: true }),
    ).toEqual({
      and: [
        { or: [{ emailFrom: { primaryEmail: { in: ['amy.wong@test.example.com'] } } }, { personId: { eq: 'person-1' } }] },
        ...INCLUDING_LOST,
      ],
    });
  });

  it('matches every address of an address list', () => {
    expect(
      leadDuplicatesFilter({ email: 'amy@example.com, "Bob" <BOB@example.com>', personId: null, companyId: null, includeLost: false }),
    ).toEqual({
      and: [
        { or: [{ emailFrom: { primaryEmail: { in: ['amy@example.com', 'bob@example.com'] } } }] },
        { wonStatus: { eq: 'PENDING' } },
      ],
    });
  });

  it('matches on the customer alone when there is no email', () => {
    expect(leadDuplicatesFilter({ email: null, personId: 'person-1', companyId: null, includeLost: true })).toEqual({
      and: [{ or: [{ personId: { eq: 'person-1' } }] }, ...INCLUDING_LOST],
    });
  });

  it('matches a company customer only on leads whose customer is that company', () => {
    expect(leadDuplicatesFilter({ email: null, personId: null, companyId: 'company-1', includeLost: false })).toEqual({
      and: [
        { or: [{ and: [{ personId: { is: 'NULL' } }, { companyId: { eq: 'company-1' } }] }] },
        { wonStatus: { eq: 'PENDING' } },
      ],
    });
  });

  it('prefers the contact over the company when both are given', () => {
    expect(leadDuplicatesFilter({ email: null, personId: 'person-1', companyId: 'company-1', includeLost: false })).toEqual({
      and: [{ or: [{ personId: { eq: 'person-1' } }] }, { wonStatus: { eq: 'PENDING' } }],
    });
  });

  it('finds nothing to look for without an email or a customer', () => {
    expect(leadDuplicatesFilter({ email: null, personId: null, companyId: null, includeLost: true })).toBeNull();
    expect(leadDuplicatesFilter({ email: 'not an address', personId: null, companyId: null, includeLost: true })).toBeNull();
  });
});
