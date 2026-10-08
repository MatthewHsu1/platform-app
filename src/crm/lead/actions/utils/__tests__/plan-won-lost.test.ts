import { describe, expect, it } from 'vitest';

import {
  planMarkLost,
  planMarkWon,
  planRestore,
} from 'src/crm/lead/actions/utils/plan-won-lost.util';

const NOW = '2026-10-06T15:00:00.000Z';

describe('planMarkWon', () => {
  it('sets won, 100 %, the closed date, clears the lost reason and moves to the Won stage', () => {
    expect(
      planMarkWon({ wonStatus: 'PENDING', stageOptionValues: ['NEW', 'WON'], now: NOW }),
    ).toEqual({
      kind: 'update',
      data: {
        wonStatus: 'WON',
        probability: 100,
        dateClosed: NOW,
        lostReasonId: null,
        stage: 'WON',
      },
    });
  });

  it('keeps the stage when staff removed the Won option', () => {
    const plan = planMarkWon({ wonStatus: 'PENDING', stageOptionValues: ['NEW', 'SIGNED'], now: NOW });

    expect(plan).toEqual({
      kind: 'update',
      data: { wonStatus: 'WON', probability: 100, dateClosed: NOW, lostReasonId: null },
    });
  });

  it('wins a lost lead straight away', () => {
    expect(planMarkWon({ wonStatus: 'LOST', stageOptionValues: [], now: NOW })).toMatchObject({
      kind: 'update',
      data: { wonStatus: 'WON', lostReasonId: null },
    });
  });

  it('refuses a lead that is already won', () => {
    expect(planMarkWon({ wonStatus: 'WON', stageOptionValues: ['WON'], now: NOW })).toEqual({
      kind: 'refuse',
      reason: 'This lead is already won.',
    });
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
