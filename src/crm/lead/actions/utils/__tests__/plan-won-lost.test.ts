import { describe, expect, it } from 'vitest';

import {
  MARK_WON_ALREADY_WON,
  MARK_WON_LOST,
  MARK_WON_NO_STAGE,
  MARK_WON_NOT_OPPORTUNITY,
  planMarkLost,
  planMarkWon,
  planRestore,
  planUseAutomaticProbability,
  sameAtTwoDecimals,
} from 'src/crm/lead/actions/utils/plan-won-lost.util';

describe('planMarkWon', () => {
  const stage = (id: string, sequence: number, isWon: boolean, teamIds: string[] = []) => ({
    id,
    name: id,
    sequence,
    isWon,
    fold: false,
    rottingThresholdDays: 0,
    createdAt: '2026-01-01T00:00:00.000Z',
    teamIds,
  });
  const STAGES = [stage('new', 1, false), stage('won5', 5, true), stage('mid', 10, false), stage('won70', 70, true)];
  const opportunity = (stageId: string | null) => ({ leadType: 'OPPORTUNITY', wonStatus: 'PENDING', stageId, teamId: null });

  it('moves to the first won stage after the current one, at 100 %', () => {
    expect(planMarkWon({ lead: opportunity('mid'), stages: STAGES })).toEqual({ kind: 'update', data: { stageId: 'won70', probability: 100 } });
    expect(planMarkWon({ lead: opportunity('new'), stages: STAGES })).toEqual({ kind: 'update', data: { stageId: 'won5', probability: 100 } });
  });

  it('falls back to the last won stage at or before the current one', () => {
    expect(planMarkWon({ lead: opportunity('won70'), stages: STAGES })).toMatchObject({ data: { stageId: 'won70' } });
  });

  it('counts a lead without a stage as sequence 0', () => {
    expect(planMarkWon({ lead: opportunity(null), stages: STAGES })).toMatchObject({ data: { stageId: 'won5' } });
  });

  it("picks among won stages for all teams and for the lead's team, by sequence", () => {
    const stages = [stage('team1New', 1, false, ['T1']), stage('genericWon', 30, true), stage('team1Won', 70, true, ['T1'])];

    expect(planMarkWon({ lead: { ...opportunity('team1New'), teamId: 'T1' }, stages })).toMatchObject({ data: { stageId: 'genericWon' } });
  });

  it('refuses when no won stage fits the lead', () => {
    expect(planMarkWon({ lead: opportunity('new'), stages: [stage('new', 1, false)] })).toEqual({ kind: 'refuse', reason: MARK_WON_NO_STAGE });
  });

  it('refuses a lead that is not an opportunity, is already won or is lost', () => {
    expect(planMarkWon({ lead: { ...opportunity('new'), leadType: 'LEAD' }, stages: STAGES })).toEqual({
      kind: 'refuse',
      reason: MARK_WON_NOT_OPPORTUNITY,
    });
    expect(planMarkWon({ lead: { ...opportunity('won5'), wonStatus: 'WON' }, stages: STAGES })).toEqual({
      kind: 'refuse',
      reason: MARK_WON_ALREADY_WON,
    });
    expect(planMarkWon({ lead: { ...opportunity('new'), wonStatus: 'LOST' }, stages: STAGES })).toEqual({ kind: 'refuse', reason: MARK_WON_LOST });
  });
});

const pending = (id: string, name: string, stageIsWon = false) => ({ id, name, wonStatus: 'PENDING', stageIsWon });

describe('planMarkLost', () => {
  it('marks every lead lost at 0 % with the reason, and zeroes the automated probability', () => {
    expect(planMarkLost({ leads: [pending('a', 'Gym A'), pending('b', 'Gym B')], lostReasonId: 'reason-2' })).toEqual({
      kind: 'update',
      userData: { wonStatus: 'LOST', probability: 0, lostReasonId: 'reason-2' },
      appData: { automatedProbability: 0 },
    });
  });

  it('clears an old reason when none is chosen', () => {
    expect(planMarkLost({ leads: [pending('a', 'Gym A')], lostReasonId: null })).toMatchObject({
      kind: 'update',
      userData: { lostReasonId: null },
    });
  });

  it('marks a lead that is already lost again, with the new reason', () => {
    expect(
      planMarkLost({
        leads: [pending('a', 'Gym A'), { id: 'b', name: 'Gym B', wonStatus: 'LOST', stageIsWon: false }],
        lostReasonId: 'reason-3',
      }),
    ).toEqual({
      kind: 'update',
      userData: { wonStatus: 'LOST', probability: 0, lostReasonId: 'reason-3' },
      appData: { automatedProbability: 0 },
    });
  });

  it('refuses the whole action when a lead is won, naming it', () => {
    expect(
      planMarkLost({
        leads: [pending('a', 'Gym A'), { id: 'b', name: 'Gym B', wonStatus: 'WON', stageIsWon: false }],
        lostReasonId: null,
      }),
    ).toEqual({
      kind: 'refuse',
      reason: 'A won lead cannot be marked lost: {names}.',
      values: { names: 'Gym B' },
    });
  });

  it('refuses the whole action when a lead sits in a won stage, naming it', () => {
    expect(planMarkLost({ leads: [pending('a', 'Gym A'), pending('b', 'Gym B', true)], lostReasonId: null })).toEqual({
      kind: 'refuse',
      reason: 'A lead in a won stage stays at 100 %. Move these leads to another stage first: {names}.',
      values: { names: 'Gym B' },
    });
  });
});

describe('planRestore', () => {
  it('reactivates the lead without its reason, at the fresh automated probability', () => {
    expect(planRestore({ wonStatus: 'LOST', storedAutomated: 0, newAutomated: 30 })).toEqual({
      kind: 'update',
      appData: { automatedProbability: 30 },
      userData: { wonStatus: 'PENDING', lostReasonId: null, probability: 30 },
    });
  });

  it('writes no automated value when the score did not move', () => {
    expect(planRestore({ wonStatus: 'LOST', storedAutomated: 0, newAutomated: 0 })).toEqual({
      kind: 'update',
      appData: null,
      userData: { wonStatus: 'PENDING', lostReasonId: null, probability: 0 },
    });
  });

  it('refuses a lead that is not lost', () => {
    expect(planRestore({ wonStatus: 'PENDING', storedAutomated: 10, newAutomated: 10 })).toEqual({
      kind: 'refuse',
      reason: 'Only a lost lead can be restored.',
    });
  });
});

describe('planUseAutomaticProbability', () => {
  it('aligns the probability with a fresh automated value', () => {
    expect(
      planUseAutomaticProbability({ wonStatus: 'PENDING', probability: 40, storedAutomated: 20.87, newAutomated: 21.5 }),
    ).toEqual({
      kind: 'update',
      appData: { automatedProbability: 21.5 },
      userData: { probability: 21.5 },
    });
  });

  it('refuses when the probability already is the automatic one at two decimals', () => {
    expect(
      planUseAutomaticProbability({ wonStatus: 'PENDING', probability: 33.494, storedAutomated: 33.49, newAutomated: 33.49 }),
    ).toEqual({ kind: 'refuse', reason: 'The probability already follows the automatic one.' });
  });

  it('refuses a lead that is not pending', () => {
    expect(
      planUseAutomaticProbability({ wonStatus: 'LOST', probability: 0, storedAutomated: 10, newAutomated: 10 }),
    ).toEqual({ kind: 'refuse', reason: 'Only a pending lead can follow the automatic probability.' });
  });
});

describe('sameAtTwoDecimals', () => {
  it('treats an empty probability as 0 and compares at two decimals', () => {
    expect(sameAtTwoDecimals(null, 0)).toBe(true);
    expect(sameAtTwoDecimals(74.304, 74.3)).toBe(true);
    expect(sameAtTwoDecimals(74.31, 74.3)).toBe(false);
  });
});
