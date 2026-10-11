import { describe, expect, it } from 'vitest';

import {
  MARK_WON_ALREADY_WON,
  MARK_WON_LOST,
  MARK_WON_NO_STAGE,
  MARK_WON_NOT_OPPORTUNITY,
  planMarkLost,
  planMarkWon,
  planRestore,
} from 'src/crm/lead/actions/utils/plan-won-lost.util';

const NOW = '2026-10-06T15:00:00.000Z';

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

describe('planMarkLost', () => {
  it('sets lost, 0 %, the closed date and the reason', () => {
    expect(planMarkLost({ wonStatus: 'PENDING', lostReasonId: 'reason-2', now: NOW })).toEqual({
      kind: 'update',
      data: { wonStatus: 'LOST', probability: 0, dateClosed: NOW, lostReasonId: 'reason-2' },
    });
  });

  it('allows no reason', () => {
    expect(planMarkLost({ wonStatus: 'PENDING', lostReasonId: null, now: NOW })).toMatchObject({
      data: { lostReasonId: null },
    });
  });

  it('refuses a won or a lost lead', () => {
    expect(planMarkLost({ wonStatus: 'WON', lostReasonId: null, now: NOW })).toEqual({
      kind: 'refuse',
      reason: 'Only a pending lead can be marked lost.',
    });
    expect(planMarkLost({ wonStatus: 'LOST', lostReasonId: null, now: NOW })).toMatchObject({
      kind: 'refuse',
    });
  });
});

describe('planRestore', () => {
  it('puts a lost lead back to pending and clears the reason and the closed date', () => {
    expect(planRestore({ wonStatus: 'LOST' })).toEqual({
      kind: 'update',
      data: { wonStatus: 'PENDING', lostReasonId: null, dateClosed: null },
    });
  });

  it('refuses a lead that is not lost', () => {
    expect(planRestore({ wonStatus: 'PENDING' })).toEqual({
      kind: 'refuse',
      reason: 'Only a lost lead can be restored.',
    });
  });
});
