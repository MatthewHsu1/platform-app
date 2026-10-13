import { describe, expect, it } from 'vitest';

import { planHelpdeskSettingsSave } from 'src/helpdesk/settings/utils/plan-helpdesk-settings-save.util';

const STORED = { autoAssign: true, duplicateTracking: false, duplicateStageId: null };

describe('planHelpdeskSettingsSave', () => {
  it('writes only the settings that changed', () => {
    expect(
      planHelpdeskSettingsSave({
        stored: STORED,
        submitted: { ...STORED, duplicateTracking: true, duplicateStageId: 'rejected' },
        stageIds: ['new', 'rejected'],
      }),
    ).toEqual({ kind: 'save', variables: { HELPDESK_DUPLICATE_TRACKING: true, HELPDESK_DUPLICATE_TICKET_STAGE: 'rejected' } });
    expect(planHelpdeskSettingsSave({ stored: STORED, submitted: STORED, stageIds: [] })).toEqual({ kind: 'save', variables: {} });
  });

  it('refuses a duplicate stage that does not exist, and accepts no stage', () => {
    expect(planHelpdeskSettingsSave({ stored: STORED, submitted: { ...STORED, duplicateStageId: 'gone' }, stageIds: ['new'] })).toEqual({
      kind: 'refuse',
      reason: 'Choose an existing stage.',
    });
    expect(planHelpdeskSettingsSave({ stored: { ...STORED, duplicateStageId: 'new' }, submitted: STORED, stageIds: ['new'] })).toEqual({
      kind: 'save',
      variables: { HELPDESK_DUPLICATE_TICKET_STAGE: '' },
    });
  });

  it('refuses a form whose switches are not yes or no', () => {
    expect(planHelpdeskSettingsSave({ stored: STORED, submitted: { ...STORED, autoAssign: 'yes' as unknown as boolean }, stageIds: [] })).toEqual({
      kind: 'refuse',
      reason: 'The work case settings are not in the expected form.',
    });
  });
});
