import { describe, expect, it } from 'vitest';

import { stageNameOf } from 'src/fieldservice-stage-validation/utils/stage-name-of.util';

describe('stageNameOf', () => {
  it('names the three stages the install makes', () => {
    expect([stageNameOf('NEW'), stageNameOf('COMPLETED'), stageNameOf('CANCELLED')]).toEqual(['New', 'Completed', 'Cancelled']);
  });

  it('reads the value of a stage staff added as words', () => {
    expect(stageNameOf('IN_PROGRESS')).toBe('In progress');
    expect(stageNameOf('SCHEDULED')).toBe('Scheduled');
  });
});
