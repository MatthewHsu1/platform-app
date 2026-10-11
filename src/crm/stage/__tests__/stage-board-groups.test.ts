import { describe, expect, it } from 'vitest';

import { type StageRow } from 'src/crm/lead/types/stage-row.type';
import { makeSyncStageBoardGroups } from 'src/crm/stage/stage-board-groups';
import { type StageBoardApi } from 'src/crm/stage/types/stage-board-api.type';

const stage = (id: string, sequence: number): StageRow => ({
  id,
  name: id,
  sequence,
  isWon: false,
  fold: false,
  rottingThresholdDays: 0,
  createdAt: '2026-01-01T00:00:00.000Z',
  teamIds: [],
});

const tick = () => new Promise<void>((resolve) => setTimeout(resolve, 0));
const waitLonger = (attempt: number) => new Promise<void>((resolve) => setTimeout(resolve, attempt * 20));

// A board as Twenty makes it: only the column of leads without a stage. Every call takes a turn, so two runs
// interleave as two triggers would.
const makeBoard = (stages: StageRow[]) => {
  const groups = [{ id: 'g-none', fieldValue: '', position: 0 }];
  const writes: string[] = [];
  const api: StageBoardApi = {
    listStages: async () => {
      await tick();
      return stages;
    },
    listStageBoards: async () => {
      await tick();
      return [{ id: 'pipeline' }];
    },
    listGroups: async () => {
      await tick();
      return groups.map((group) => ({ ...group }));
    },
    createGroup: async (_viewId, fieldValue, position) => {
      await tick();
      writes.push(`create ${fieldValue}`);
      groups.push({ id: `g-${groups.length}`, fieldValue, position });
    },
    moveGroup: async (groupId, position) => {
      await tick();
      writes.push(`move ${groupId}`);
      const group = groups.find((candidate) => candidate.id === groupId);

      if (group !== undefined) {
        group.position = position;
      }
    },
    destroyGroup: async (groupId) => {
      await tick();
      writes.push(`destroy ${groupId}`);
      groups.splice(
        groups.findIndex((candidate) => candidate.id === groupId),
        1,
      );
    },
  };
  return { api, groups, writes };
};

// One run per key at a time, as the claim does.
const makeRunAlone = () => {
  const running = new Set<string>();

  return async (key: string, run: () => Promise<void>) => {
    if (running.has(key)) {
      return { kind: 'held' as const };
    }
    running.add(key);
    try {
      await run();
    } finally {
      running.delete(key);
    }
    return { kind: 'done' as const };
  };
};

const STAGES = [stage('new', 1), stage('qualified', 2), stage('won', 70)];

describe('stage board columns', () => {
  it('gives each stage one column when the install and a stage save redraw the board at the same time', async () => {
    const { api, groups } = makeBoard(STAGES);
    const sync = makeSyncStageBoardGroups(api, makeRunAlone(), waitLonger);

    await Promise.all([sync(), sync()]);

    expect(groups.map((group) => group.fieldValue).sort()).toEqual(['', 'new', 'qualified', 'won']);
  });

  it('writes nothing on a second run', async () => {
    const { api, writes } = makeBoard(STAGES);
    const sync = makeSyncStageBoardGroups(api, makeRunAlone(), waitLonger);
    await sync();
    const first = writes.length;

    await sync();

    expect(writes.slice(first)).toEqual([]);
  });
});
