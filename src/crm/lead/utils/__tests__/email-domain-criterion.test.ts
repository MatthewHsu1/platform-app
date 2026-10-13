import { describe, expect, it } from 'vitest';

import { emailDomainCriterion } from 'src/crm/lead/utils/email-domain-criterion.util';

describe('emailDomainCriterion', () => {
  it('keeps only the domain of a company address', () => {
    expect(emailDomainCriterion('raoul@mydomain.com')).toBe('@mydomain.com');
    expect(emailDomainCriterion('"Raoul Lachignole" <raoul@mydomain.com>')).toBe('@mydomain.com');
    expect(emailDomainCriterion('robert.poilvert@mycompany.com')).toBe('@mycompany.com');
    expect(emailDomainCriterion('floppy@MYCOMPANY.com')).toBe('@mycompany.com');
  });

  it('keeps the whole address of a free-mail provider, lower-cased', () => {
    expect(emailDomainCriterion('x@gmail.com')).toBe('x@gmail.com');
    expect(emailDomainCriterion('X@GMAIL.COM')).toBe('x@gmail.com');
    expect(emailDomainCriterion('robert.poilvert@gmail.com')).toBe('robert.poilvert@gmail.com');
    expect(emailDomainCriterion('a@example.com')).toBe('a@example.com');
  });

  it('keeps a text without "@" as it is, and gives nothing for no text', () => {
    expect(emailDomainCriterion('nodomain')).toBe('nodomain');
    expect(emailDomainCriterion('')).toBeNull();
    expect(emailDomainCriterion(null)).toBeNull();
  });
});
