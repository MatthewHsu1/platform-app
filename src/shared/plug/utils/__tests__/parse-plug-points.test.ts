import { describe, expect, it } from 'vitest';

import { parsePlugPoints, plugKeyVariableName } from 'src/shared/plug/utils/parse-plug-points.util';

describe('parsePlugPoints', () => {
  it('reads a configured plug point and keeps its own keys', () => {
    const raw = JSON.stringify({
      version: 1,
      points: {
        'crm.assignment.v1': {
          enabled: true,
          target: { kind: 'route', path: '/acme-assignment/assign' },
          timeoutSeconds: 45,
          onError: 'SKIP',
          leftOut: 'UNTOUCHED',
        },
      },
    });

    expect(parsePlugPoints(raw).points['crm.assignment.v1']).toEqual({
      enabled: true,
      target: { kind: 'route', path: '/acme-assignment/assign' },
      timeoutSeconds: 45,
      onError: 'SKIP',
      leftOut: 'UNTOUCHED',
    });
  });

  it('falls back to off, no target, 30 seconds and the built-in steps', () => {
    expect(parsePlugPoints(JSON.stringify({ points: { 'crm.assignment.v1': { target: { kind: 'ftp' } } } })).points['crm.assignment.v1']).toEqual({
      enabled: false,
      target: null,
      timeoutSeconds: 30,
      onError: 'DEFAULT',
    });
  });

  it('keeps the timeout between 1 and 120 seconds', () => {
    const timeout = (timeoutSeconds: unknown) => parsePlugPoints(JSON.stringify({ points: { p: { timeoutSeconds } } })).points.p.timeoutSeconds;

    expect(timeout(0)).toBe(1);
    expect(timeout(500)).toBe(120);
    expect(timeout('soon')).toBe(30);
  });

  it('reads broken or missing settings as no plug point', () => {
    expect(parsePlugPoints('{oops').points).toEqual({});
    expect(parsePlugPoints(undefined).points).toEqual({});
  });

  it('names the secret key variable after the plug point', () => {
    expect(plugKeyVariableName('crm.assignment.v1')).toBe('PLUG_KEY_CRM_ASSIGNMENT_V1');
  });
});
