import { describe, expect, it } from 'vitest';

import { planSlaStageChange } from 'src/helpdesk-sla/utils/plan-sla-stage-change.util';
import { T0, h, roundTheClock, row, stageSequence } from 'src/helpdesk-sla/utils/__tests__/sla-fixtures';

const change = (current: ReturnType<typeof row>, caseStageId: string, now: string, ignoreStageIds: string[] = []) => ({
  ...current,
  ...planSlaStageChange({ row: current, caseStageId, ignoreStageIds, stageSequence, now, ...roundTheClock }),
});

describe('planSlaStageChange', () => {
  it('is accomplished when the case reaches the target stage before the deadline, keeping the deadline', () => {
    expect(change(row(), 'two', h(1))).toEqual(row({ consumedTime: 1, state: 'ACCOMPLISHED', lastStateDate: h(1) }));
  });

  it('expires when the case reaches the target stage after the deadline', () => {
    expect(change(row(), 'two', h(3))).toEqual(row({ consumedTime: 3, state: 'EXPIRED', lastStateDate: h(3) }));
  });

  it('pauses in an ignored stage and starts again, the deadline moved by the pause', () => {
    const paused = change(row(), 'oneOne', h(1), ['oneOne']);

    expect(paused).toEqual(row({ consumedTime: 1, state: 'ON_HOLD', lastStateDate: h(1), deadline: h(2) }));

    const resumed = change(paused, 'oneTwo', h(3), ['oneOne']);

    expect(resumed).toEqual(row({ consumedTime: 1, state: 'IN_PROGRESS', lastStateDate: h(3), deadline: h(4) }));
  });

  it('goes back to in progress when an accomplished case moves before the target stage', () => {
    const accomplished = change(row(), 'two', T0);

    expect(change(accomplished, 'one', T0).state).toBe('IN_PROGRESS');
  });

  it('stays expired whatever the case does next', () => {
    const expired = row({ consumedTime: 3, state: 'EXPIRED', lastStateDate: h(3) });

    expect(planSlaStageChange({ row: expired, caseStageId: 'one', ignoreStageIds: ['oneOne'], stageSequence, now: h(4), ...roundTheClock })).toEqual({});
  });

  it('stays accomplished when the case moves on past an intermediate target', () => {
    const accomplished = change(row({ expectedStageId: 'oneTwo' }), 'oneTwo', h(1));

    expect(accomplished.state).toBe('ACCOMPLISHED');
    expect(change(accomplished, 'two', h(3))).toEqual({ ...accomplished, lastStateDate: h(3) });
  });
});
