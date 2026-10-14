import { describe, expect, it } from 'vitest';

import { diffValidationRules } from 'src/fieldservice-stage-validation/utils/diff-validation-rules.util';

const rule = (name: string, expression = 'a', message = 'm') => ({ name, expression, message });

describe('diffValidationRules', () => {
  it('makes the missing rule, updates the changed one, removes the one no row asks for, and touches no other rule', () => {
    const stored = [
      { id: '1', ...rule('platform-stage-rule:r1:TEAM') },
      { id: '2', ...rule('platform-stage-rule:r1:PERSON', 'old') },
      { id: '3', ...rule('platform-stage-rule:r0:TEAM') },
      { id: '4', ...rule('platform-crm-lead-probability-range') },
    ];
    const wanted = [rule('platform-stage-rule:r1:TEAM'), rule('platform-stage-rule:r1:PERSON', 'new'), rule('platform-stage-rule:r1:LOCATION')];

    expect(diffValidationRules(stored, wanted)).toEqual({
      create: [rule('platform-stage-rule:r1:LOCATION')],
      update: [{ id: '2', ...rule('platform-stage-rule:r1:PERSON', 'new') }],
      remove: ['3'],
    });
  });

  it('finds nothing to do the second time', () => {
    const wanted = [rule('platform-stage-rule:r1:TEAM')];

    expect(diffValidationRules([{ id: '1', ...wanted[0] }], wanted)).toEqual({ create: [], update: [], remove: [] });
  });
});
