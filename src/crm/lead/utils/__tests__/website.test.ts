import { describe, expect, it } from 'vitest';

import { cleanWebsite } from 'src/crm/lead/utils/website.util';

describe('cleanWebsite', () => {
  it('adds http to an address without a scheme', () => {
    expect(cleanWebsite('www.example.com')).toBe('http://www.example.com');
  });

  it('keeps an address that has a scheme', () => {
    expect(cleanWebsite('https://example.com/a')).toBe('https://example.com/a');
  });

  it('keeps an empty address empty', () => {
    expect(cleanWebsite('')).toBe('');
    expect(cleanWebsite(null)).toBeNull();
  });
});
