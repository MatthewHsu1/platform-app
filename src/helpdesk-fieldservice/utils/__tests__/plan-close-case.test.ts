import { describe, expect, it } from 'vitest';

import { planCloseCase } from 'src/helpdesk-fieldservice/utils/plan-close-case.util';

describe('planCloseCase', () => {
  it('writes the chosen stage and the resolution together', () => {
    expect(planCloseCase({ stageId: 'done', resolution: 'Just another resolution' })).toEqual({
      kind: 'write',
      data: { stageId: 'done', resolution: { markdown: 'Just another resolution' } },
    });
  });

  it('needs a stage', () => {
    expect(planCloseCase({ stageId: null, resolution: 'Fixed' })).toEqual({ kind: 'refuse', reason: 'Choose the stage the work case moves to.' });
  });

  it('needs a resolution that is not blank', () => {
    expect(planCloseCase({ stageId: 'done', resolution: '  \n' })).toEqual({ kind: 'refuse', reason: 'Type the resolution of the work case.' });
  });
});
