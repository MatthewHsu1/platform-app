import { describe, expect, it } from 'vitest';

import { planRottingWrites } from 'src/crm/lead/utils/plan-rotting-writes.util';
import { rottingValues } from 'src/crm/lead/utils/rotting.util';
import { lead, STAGES } from 'src/crm/scoring/utils/__tests__/scoring-fixtures';

const FIVE_DAYS = { ...STAGES[0], id: 'five', rottingThresholdDays: 5 };
const THREE_DAYS = { ...STAGES[1], id: 'three', rottingThresholdDays: 3 };
const opportunity = (stageId: string, dateLastStageUpdate: string) =>
  lead({ id: `${stageId}-${dateLastStageUpdate}`, stageId, dateLastStageUpdate, leadType: 'OPPORTUNITY', wonStatus: 'PENDING' });

describe('rottingValues', () => {
  it('flags an opportunity left in its stage longer than the stage allows, with the total days', () => {
    expect(rottingValues(opportunity('five', '2025-01-10T12:00:00.000Z'), FIVE_DAYS, '2025-01-20T12:00:00.000Z')).toEqual({ isRotting: true, rottingDays: 10 });
    expect(rottingValues(opportunity('five', '2025-01-10T12:00:00.000Z'), FIVE_DAYS, '2025-01-24T12:00:00.000Z')).toEqual({ isRotting: true, rottingDays: 14 });
  });

  it('does not flag a lead that has not been there long enough', () => {
    expect(rottingValues(opportunity('five', '2025-01-18T12:00:00.000Z'), FIVE_DAYS, '2025-01-20T12:00:00.000Z')).toEqual({ isRotting: false, rottingDays: 0 });
    expect(rottingValues(opportunity('five', '2025-01-20T12:00:00.000Z'), FIVE_DAYS, '2025-01-24T12:00:00.000Z')).toEqual({ isRotting: false, rottingDays: 0 });
    expect(rottingValues(opportunity('three', '2025-01-20T12:00:00.000Z'), THREE_DAYS, '2025-01-20T12:00:00.000Z')).toEqual({ isRotting: false, rottingDays: 0 });
  });

  it('counts from the last stage change', () => {
    expect(rottingValues(opportunity('three', '2025-01-20T12:00:00.000Z'), THREE_DAYS, '2025-01-24T12:00:00.000Z')).toEqual({ isRotting: true, rottingDays: 4 });
  });

  it('turns off with a higher or a zero threshold', () => {
    const old = opportunity('five', '2025-01-10T12:00:00.000Z');

    expect(rottingValues(old, { ...FIVE_DAYS, rottingThresholdDays: 50 }, '2025-01-20T12:00:00.000Z').isRotting).toBe(false);
    expect(rottingValues(old, { ...FIVE_DAYS, rottingThresholdDays: 0 }, '2025-01-20T12:00:00.000Z').isRotting).toBe(false);
  });

  it('never flags a lead, a won or lost opportunity, or a lead without a stage', () => {
    const old = '2025-01-01T00:00:00.000Z';
    const now = '2025-01-10T00:00:00.000Z';

    expect(rottingValues({ ...opportunity('five', old), leadType: 'LEAD' }, FIVE_DAYS, now).isRotting).toBe(false);
    expect(rottingValues({ ...opportunity('five', old), wonStatus: 'WON' }, FIVE_DAYS, now).isRotting).toBe(false);
    expect(rottingValues({ ...opportunity('five', old), wonStatus: 'LOST' }, FIVE_DAYS, now).isRotting).toBe(false);
    expect(rottingValues(opportunity('five', old), null, now).isRotting).toBe(false);
  });
});

describe('planRottingWrites', () => {
  it('writes only the leads whose values change, grouped by value', () => {
    const now = '2025-01-20T12:00:00.000Z';
    const stale = opportunity('five', '2025-01-10T12:00:00.000Z');
    const alsoStale = { ...opportunity('five', '2025-01-10T12:00:00.000Z'), id: 'other' };
    const alreadyFlagged = { ...stale, id: 'flagged', isRotting: true, rottingDays: 10 };
    const recovered = { ...opportunity('five', '2025-01-19T12:00:00.000Z'), id: 'recovered', isRotting: true, rottingDays: 7 };

    expect(planRottingWrites([stale, alsoStale, alreadyFlagged, recovered], [FIVE_DAYS], now)).toEqual([
      { ids: [stale.id, 'other'], data: { isRotting: true, rottingDays: 10 } },
      { ids: ['recovered'], data: { isRotting: false, rottingDays: 0 } },
    ]);
  });
});
