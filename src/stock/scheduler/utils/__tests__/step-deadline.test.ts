import { describe, expect, it } from 'vitest';

import { stepDeadline } from 'src/stock/scheduler/utils/step-deadline.util';

const JOB_START = 1_000_000;

describe('stepDeadline', () => {
  it('gives the step its whole budget when the job has time left', () => {
    expect(stepDeadline({ now: JOB_START + 100_000, jobStartedAt: JOB_START, budgetMs: 240_000 })).toBe(
      JOB_START + 340_000,
    );
  });

  it('ends the step a minute before the job limit when the earlier steps ran long', () => {
    expect(stepDeadline({ now: JOB_START + 700_000, jobStartedAt: JOB_START, budgetMs: 240_000 })).toBe(
      JOB_START + 840_000,
    );
  });

  it('leaves no time when the job is already inside its last minute', () => {
    expect(stepDeadline({ now: JOB_START + 870_000, jobStartedAt: JOB_START, budgetMs: 240_000 })).toBe(
      JOB_START + 840_000,
    );
  });
});
