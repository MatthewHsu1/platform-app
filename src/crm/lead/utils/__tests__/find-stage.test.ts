import { describe, expect, it } from 'vitest';

import { type StageRow } from 'src/crm/lead/types/stage-row.type';
import { findStage } from 'src/crm/lead/utils/find-stage.util';

const at = (order: number) => `2026-01-0${order}T00:00:00.000Z`;
const stage = (id: string, sequence: number, teamIds: string[], extra: Partial<StageRow> = {}, created = 1): StageRow => ({
  id,
  name: id,
  sequence,
  isWon: false,
  fold: false,
  rottingThresholdDays: 0,
  createdAt: at(created),
  teamIds,
  ...extra,
});

// Two stages for team T1, a won stage of T1, and a first stage and a won
// stage for all teams.
const STAGES = [
  stage('team1New', 1, ['T1']),
  stage('team1Second', 5, ['T1']),
  stage('team1Won', 70, ['T1'], { isWon: true }),
  stage('genericNew', 3, []),
  stage('genericWon', 30, [], { isWon: true }),
];

describe('findStage', () => {
  it('gives a lead without a team the first stage that is for all teams', () => {
    expect(findStage({ stages: STAGES, teamId: null, foldFilter: true, limit: 'first' }).map((row) => row.id)).toEqual([
      'genericNew',
    ]);
  });

  it('gives a lead of a team the first stage of that team or for all teams', () => {
    expect(findStage({ stages: STAGES, teamId: 'T1', foldFilter: true, limit: 'first' }).map((row) => row.id)).toEqual([
      'team1New',
    ]);
  });

  it('lists the won stages of a team and for all teams in sequence order', () => {
    expect(
      findStage({ stages: STAGES, teamId: 'T1', onlyWon: true, foldFilter: false, limit: 'all' }).map((row) => row.id),
    ).toEqual(['genericWon', 'team1Won']);
  });

  it('skips folded stages when asked to', () => {
    const stages = [stage('folded', 1, [], { fold: true }), stage('open', 2, [])];

    expect(findStage({ stages, teamId: null, foldFilter: true, limit: 'first' }).map((row) => row.id)).toEqual(['open']);
    expect(findStage({ stages, teamId: null, foldFilter: false, limit: 'first' }).map((row) => row.id)).toEqual(['folded']);
  });

  it('breaks a tie on sequence by creation order', () => {
    const stages = [stage('later', 1, [], {}, 2), stage('earlier', 1, [], {}, 1)];

    expect(findStage({ stages, teamId: null, foldFilter: true, limit: 'first' })[0].id).toBe('earlier');
  });

  it('finds nothing when no stage fits', () => {
    expect(findStage({ stages: [stage('other', 1, ['T2'])], teamId: 'T1', foldFilter: true, limit: 'first' })).toEqual([]);
  });
});
