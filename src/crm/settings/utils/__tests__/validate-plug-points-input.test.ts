import { describe, expect, it } from 'vitest';

import { validatePlugPointsInput } from 'src/crm/settings/utils/validate-plug-points-input.util';

const point = (overrides: Record<string, unknown>) => ({
  version: 1,
  points: { 'crm.assignment.v1': { enabled: true, target: { kind: 'route', path: '/acme/assign' }, timeoutSeconds: 30, onError: 'DEFAULT', leftOut: 'DEFAULT', ...overrides } },
});

describe('validatePlugPointsInput', () => {
  it('accepts a route path of a plugin app and an https address', () => {
    expect(validatePlugPointsInput(point({})).kind).toBe('valid');
    expect(validatePlugPointsInput(point({ target: { kind: 'url', url: 'https://rules.example.com/assign' } })).kind).toBe('valid');
    expect(validatePlugPointsInput(point({ enabled: false, target: null })).kind).toBe('valid');
  });

  it('refuses a route with a scheme or host, and an address that is not https', () => {
    expect(validatePlugPointsInput(point({ target: { kind: 'route', path: 'acme/assign' } })).kind).toBe('invalid');
    expect(validatePlugPointsInput(point({ target: { kind: 'route', path: '//evil.example.com/x' } })).kind).toBe('invalid');
    expect(validatePlugPointsInput(point({ target: { kind: 'route', path: '/x?u=https://a' } })).kind).toBe('invalid');
    expect(validatePlugPointsInput(point({ target: { kind: 'url', url: 'http://rules.example.com' } })).kind).toBe('invalid');
    expect(validatePlugPointsInput(point({ target: { kind: 'url', url: 'not a url' } })).kind).toBe('invalid');
  });

  it('keeps the timeout between 1 and 120 seconds and the choices to their values', () => {
    expect(validatePlugPointsInput(point({ timeoutSeconds: 0 })).kind).toBe('invalid');
    expect(validatePlugPointsInput(point({ timeoutSeconds: 121 })).kind).toBe('invalid');
    expect(validatePlugPointsInput(point({ timeoutSeconds: 120 })).kind).toBe('valid');
    expect(validatePlugPointsInput(point({ onError: 'RETRY' })).kind).toBe('invalid');
    expect(validatePlugPointsInput(point({ leftOut: 'ALL' })).kind).toBe('invalid');
  });

  it('refuses a plug point this version does not implement', () => {
    expect(validatePlugPointsInput({ version: 1, points: { 'crm.assignment.v2': {} } }).kind).toBe('invalid');
    expect(validatePlugPointsInput({ version: 2, points: {} }).kind).toBe('invalid');
  });
});
