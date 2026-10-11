import { describe, expect, it } from 'vitest';

import { emailDisplayName, emailState, normaliseEmail, splitEmails } from 'src/crm/lead/utils/email.util';

describe('normaliseEmail', () => {
  it('drops the display name and lower-cases a plain address', () => {
    expect(normaliseEmail('Name <NaMe@DoMaIn.CoM>')).toBe('name@domain.com');
  });

  it('reads a quoted display name that holds a comma as one address', () => {
    expect(normaliseEmail('"Philip, J. Fry" <philip.j.fry@test.example.com>')).toBe('philip.j.fry@test.example.com');
  });

  it('gives no result when the text holds two addresses', () => {
    expect(normaliseEmail('tony@e.com, "Tony2" <tony2@e.com>')).toBeNull();
  });

  it('keeps a local part that is not plain ASCII as typed and lower-cases the domain', () => {
    expect(normaliseEmail('Éva@DOMAIN.com')).toBe('Éva@domain.com');
  });

  it('accepts a domain without a dot', () => {
    expect(normaliseEmail('admin@localhost')).toBe('admin@localhost');
  });

  it('gives no result for text without an at sign', () => {
    expect(normaliseEmail('broken')).toBeNull();
    expect(normaliseEmail('')).toBeNull();
    expect(normaliseEmail(null)).toBeNull();
  });
});

describe('splitEmails', () => {
  it('finds every address of a list with its display name', () => {
    expect(splitEmails('tony@e.com, "Tony2" <tony2@e.com>')).toEqual([
      { name: '', email: 'tony@e.com' },
      { name: 'Tony2', email: 'tony2@e.com' },
    ]);
  });

  it('reads an unquoted name followed by an address split by spaces', () => {
    expect(splitEmails('Raoul Grosbedon raoul@grosbedon.fr')).toEqual([{ name: 'Raoul Grosbedon', email: 'raoul@grosbedon.fr' }]);
  });
});

describe('emailDisplayName', () => {
  it('reads the display name of a single address', () => {
    expect(emailDisplayName('"Ann Lee" <ann@x.com>')).toBe('Ann Lee');
  });

  it('has none for a bare address', () => {
    expect(emailDisplayName('ann@x.com')).toBeNull();
  });
});

describe('emailState', () => {
  it('is empty when the lead has no email', () => {
    expect(emailState(null)).toBeNull();
    expect(emailState({ primaryEmail: '', additionalEmails: [] })).toBeNull();
  });

  it('is correct when one address is usable', () => {
    expect(emailState({ primaryEmail: 'broken', additionalEmails: ['ann@x.com'] })).toBe('CORRECT');
  });

  it('is correct when one value holds a list of addresses', () => {
    expect(emailState({ primaryEmail: 'tony@e.com, "Tony2" <tony2@e.com>', additionalEmails: null })).toBe('CORRECT');
  });

  it('is correct when one of several values is usable and the first is not', () => {
    expect(emailState({ primaryEmail: 'broken', additionalEmails: ['also broken', 'tony2@e.com'] })).toBe('CORRECT');
  });

  it('is incorrect when no address is usable', () => {
    expect(emailState({ primaryEmail: 'broken', additionalEmails: null })).toBe('INCORRECT');
  });
});
