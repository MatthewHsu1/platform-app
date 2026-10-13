import { describe, expect, it } from 'vitest';

import { normalizeDomain } from 'src/shared/utils/normalize-domain.util';

// Expected values are those of Twenty's own normalizeDomain, which the server
// applies to a company website before it stores it.
describe('normalizeDomain', () => {
  it.each([
    'twenty.com',
    'TWENTY.com',
    'www.twenty.com',
    'https://twenty.com',
    'https://www.twenty.com/',
    'http://www.Twenty.com/careers?utm=1#team',
    '  https://twenty.com  ',
    'twenty.com.',
    'twenty.com:8080',
    'https://user:secret@www.twenty.com',
    'ftp://twenty.com',
    'twenty.com\\@evil.com',
    'https://a@b@twenty.com',
    'www.www.twenty.com',
    'twenty.com..',
  ])('reduces %s to the bare domain', (rawDomain) => {
    expect(normalizeDomain(rawDomain)).toBe('twenty.com');
  });

  it('keeps subdomains other than www', () => {
    expect(normalizeDomain('https://blog.twenty.com')).toBe('blog.twenty.com');
  });

  it('spells an international domain in punycode', () => {
    expect(normalizeDomain('https://München.de')).toBe('xn--mnchen-3ya.de');
  });

  it('gives back text that is no domain, and an empty text, as they are', () => {
    expect(normalizeDomain('not a domain')).toBe('not a domain');
    expect(normalizeDomain('')).toBe('');
  });
});
