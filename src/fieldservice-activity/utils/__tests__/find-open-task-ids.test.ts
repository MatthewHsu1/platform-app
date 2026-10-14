import { describe, expect, it } from 'vitest';

import { findOpenTaskIds } from 'src/fieldservice-activity/utils/find-open-task-ids.util';

const target = (id: string, status: string | null, deletedAt: string | null = null) => ({ task: { id, status, deletedAt } });

describe('findOpenTaskIds', () => {
  it('lists the tasks that are to do or in progress', () => {
    expect(findOpenTaskIds([target('a', 'TODO'), target('b', 'IN_PROGRESS'), target('c', null)])).toEqual(['a', 'b', 'c']);
  });

  it('skips done tasks, tasks in the trash and targets whose task is gone', () => {
    expect(findOpenTaskIds([target('a', 'DONE'), target('b', 'TODO', '2026-10-01T00:00:00.000Z'), { task: null }])).toEqual([]);
  });

  it('counts a task attached twice once', () => {
    expect(findOpenTaskIds([target('a', 'TODO'), target('a', 'TODO')])).toEqual(['a']);
  });
});
