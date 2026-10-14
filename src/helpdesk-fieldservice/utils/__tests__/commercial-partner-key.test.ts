import { describe, expect, it } from 'vitest';

import { companyCommercialKey, locationCommercialKey, personCommercialKey } from 'src/helpdesk-fieldservice/utils/commercial-partner-key.util';

describe('commercial partner keys', () => {
  it('counts a contact as its company, and a contact without one as itself', () => {
    expect(personCommercialKey({ id: 'jill', companyId: 'acme' })).toBe('company:acme');
    expect(personCommercialKey({ id: 'bob', companyId: null })).toBe('person:bob');
    expect(companyCommercialKey('acme')).toBe('company:acme');
  });

  const noLocation = { partnerPersonId: null, partnerCompanyId: null, ownerPersonId: null, ownerCompanyId: null };
  const companies = new Map([['jill', 'acme'], ['bob', null]]);

  it('names the customer of a location by its related company first', () => {
    expect(locationCommercialKey({ ...noLocation, partnerCompanyId: 'acme', partnerPersonId: 'bob' }, companies)).toBe('company:acme');
  });

  it('names the customer of a location by its related contact, through the contact company', () => {
    expect(locationCommercialKey({ ...noLocation, partnerPersonId: 'jill' }, companies)).toBe('company:acme');
    expect(locationCommercialKey({ ...noLocation, partnerPersonId: 'bob' }, companies)).toBe('person:bob');
  });

  it('falls back to the owner when the location has no related contact or company', () => {
    expect(locationCommercialKey({ ...noLocation, ownerCompanyId: 'acme' }, companies)).toBe('company:acme');
    expect(locationCommercialKey({ ...noLocation, ownerPersonId: 'bob' }, companies)).toBe('person:bob');
  });

  it('gives a location with no related contact, company or owner no customer', () => {
    expect(locationCommercialKey(noLocation, companies)).toBeNull();
  });
});
