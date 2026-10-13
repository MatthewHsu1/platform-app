import { describe, expect, it } from 'vitest';

import { formPlugPoints } from 'src/crm/settings/utils/form-plug-points.util';

describe('formPlugPoints', () => {
  it('shows the lead assignment plug point with its defaults when nothing is stored', () => {
    expect(formPlugPoints({ version: 1, points: {} })).toEqual({
      version: 1,
      points: { 'crm.assignment.v1': { enabled: false, target: null, timeoutSeconds: 30, onError: 'DEFAULT', leftOut: 'DEFAULT' } },
    });
  });

  it('keeps what is stored, and shows a missing or unknown left-out choice as the built-in way', () => {
    const stored = { enabled: true, target: { kind: 'route' as const, path: '/acme/assign' }, timeoutSeconds: 45, onError: 'SKIP' as const };

    expect(formPlugPoints({ version: 1, points: { 'crm.assignment.v1': stored } }).points['crm.assignment.v1']).toEqual({ ...stored, leftOut: 'DEFAULT' });
    expect(formPlugPoints({ version: 1, points: { 'crm.assignment.v1': { ...stored, leftOut: 'ALL' } } }).points['crm.assignment.v1']?.leftOut).toBe('DEFAULT');
    expect(formPlugPoints({ version: 1, points: { 'crm.assignment.v1': { ...stored, leftOut: 'UNTOUCHED' } } }).points['crm.assignment.v1']?.leftOut).toBe(
      'UNTOUCHED',
    );
  });
});
