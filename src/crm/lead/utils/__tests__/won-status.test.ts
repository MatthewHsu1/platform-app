import { describe, expect, it } from 'vitest';

import { planWonStatus, statusMovesBetween } from 'src/crm/lead/utils/won-status.util';

describe('planWonStatus', () => {
  it('is won at 100 % in a won stage', () => {
    expect(planWonStatus({ probability: 100, stageIsWon: true, archived: false })).toBe('WON');
    expect(planWonStatus({ probability: 100, stageIsWon: true, archived: true })).toBe('WON');
  });

  it('is pending at 100 % in a stage that is not won', () => {
    expect(planWonStatus({ probability: 100, stageIsWon: false, archived: false })).toBe('PENDING');
  });

  it('is lost when archived at 0 %, an empty probability counting as 0', () => {
    expect(planWonStatus({ probability: 0, stageIsWon: false, archived: true })).toBe('LOST');
    expect(planWonStatus({ probability: null, stageIsWon: false, archived: true })).toBe('LOST');
  });

  it('is pending when archived with a probability above 0', () => {
    expect(planWonStatus({ probability: 30, stageIsWon: false, archived: true })).toBe('PENDING');
  });
});

describe('statusMovesBetween', () => {
  it('counts reaching and leaving won and lost, both in one save', () => {
    expect(statusMovesBetween('PENDING', 'WON')).toEqual({ won: 1, lost: 0 });
    expect(statusMovesBetween('WON', 'PENDING')).toEqual({ won: -1, lost: 0 });
    expect(statusMovesBetween('LOST', 'WON')).toEqual({ won: 1, lost: -1 });
    expect(statusMovesBetween(null, 'LOST')).toEqual({ won: 0, lost: 1 });
    expect(statusMovesBetween('PENDING', 'PENDING')).toEqual({ won: 0, lost: 0 });
  });
});
