import { describe, expect, it } from 'vitest';

import { type StageRow } from 'src/crm/lead/types/stage-row.type';
import { sortStages } from 'src/crm/stage/utils/sort-stages.util';

const stage = (id: string, sequence: number, name: string, createdAt: string): StageRow => ({
  id,
  name,
  sequence,
  isWon: false,
  fold: false,
  rottingThresholdDays: 0,
  createdAt,
  teamIds: [],
});

describe('sortStages', () => {
  it('orders by sequence, then name, then creation', () => {
    const stages = [
      stage('c', 2, 'Beta', '2026-01-03T00:00:00.000Z'),
      stage('a', 2, 'Alpha', '2026-01-02T00:00:00.000Z'),
      stage('b', 1, 'Zulu', '2026-01-01T00:00:00.000Z'),
      stage('d', 2, 'Alpha', '2026-01-01T00:00:00.000Z'),
    ];

    expect(sortStages(stages).map((row) => row.id)).toEqual(['b', 'd', 'a', 'c']);
  });
});
