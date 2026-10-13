import { describe, expect, it } from 'vitest';

import { buildPlugRequest } from 'src/shared/plug/utils/build-plug-request.util';
import { describePlugFailure } from 'src/shared/plug/utils/describe-plug-failure.util';

const ENV = { TWENTY_API_URL: 'http://server:3000', TWENTY_APP_APPLICATION_ACCESS_TOKEN: 'app-token', PLUG_KEY_CRM_ASSIGNMENT_V1: 'outside-key' };

describe('buildPlugRequest', () => {
  it('calls a route of another app in the workspace with the app token', () => {
    expect(buildPlugRequest({ name: 'crm.assignment.v1', target: { kind: 'route', path: '/acme/assign' }, env: ENV })).toEqual({
      kind: 'ok',
      url: 'http://server:3000/s/acme/assign',
      headers: { 'content-type': 'application/json', authorization: 'Bearer app-token' },
    });
  });

  it('uses the functions address when the server sets one', () => {
    const request = buildPlugRequest({
      name: 'crm.assignment.v1',
      target: { kind: 'route', path: '/acme/assign' },
      env: { ...ENV, TWENTY_FUNCTIONS_URL: 'http://functions:4000/s/' },
    });

    expect(request).toMatchObject({ kind: 'ok', url: 'http://functions:4000/s/acme/assign' });
  });

  it("refuses a route path that could leave the workspace's routes", () => {
    for (const path of ['//evil.example/x', 'https://evil.example/x', 'acme/assign', '/acme/../graphql', '/acme/..']) {
      expect(buildPlugRequest({ name: 'crm.assignment.v1', target: { kind: 'route', path }, env: ENV }).kind).toBe('error');
    }
  });

  it('sends an outside address its own key and never the app token', () => {
    const request = buildPlugRequest({ name: 'crm.assignment.v1', target: { kind: 'url', url: 'https://rules.example/assign' }, env: ENV });

    expect(request).toEqual({
      kind: 'ok',
      url: 'https://rules.example/assign',
      headers: { 'content-type': 'application/json', authorization: 'Bearer outside-key' },
    });
  });

  it('sends no key to an outside address that has none', () => {
    const request = buildPlugRequest({
      name: 'crm.assignment.v1',
      target: { kind: 'url', url: 'https://rules.example/assign' },
      env: { ...ENV, PLUG_KEY_CRM_ASSIGNMENT_V1: '' },
    });

    expect(request).toEqual({ kind: 'ok', url: 'https://rules.example/assign', headers: { 'content-type': 'application/json' } });
  });

  it('refuses an outside address that is not https', () => {
    const request = buildPlugRequest({ name: 'crm.assignment.v1', target: { kind: 'url', url: 'http://rules.example/assign' }, env: ENV });

    expect(request.kind === 'error' ? describePlugFailure(request.failure) : request).toBe('An outside plug point address must use https.');
  });
});
