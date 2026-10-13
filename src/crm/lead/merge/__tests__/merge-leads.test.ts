import { describe, expect, it } from 'vitest';

import { makeFakeMergeApi } from 'src/crm/lead/merge/__tests__/fakes/fake-merge-api';
import { makeMergeLeads } from 'src/crm/lead/merge/make-merge-leads';
import { type MergeApi } from 'src/crm/lead/merge/types/merge-api.type';
import { leadRow } from 'src/crm/lead/merge/utils/__tests__/fixtures/lead-row.fixture';

type FakeMergeState = Parameters<typeof makeFakeMergeApi>[0];

const freshState = (): FakeMergeState => ({
  leads: new Map([
    [
      'head',
      leadRow({
        id: 'head',
        createdAt: '2026-02-01T00:00:01.000Z',
        name: 'Gym A',
        leadType: 'OPPORTUNITY',
        probability: 60,
        stageId: 'gen-1',
        description: { markdown: 'Wants 12 treadmills' },
      }),
    ],
    [
      'tail-1',
      leadRow({
        id: 'tail-1',
        createdAt: '2026-02-01T00:00:02.000Z',
        name: 'Gym B',
        probability: 20,
        stageId: 'gen-1',
        priority: 'HIGH',
        tags: ['Gym'],
        language: 'fr_FR',
        description: { markdown: 'Budget 20k\n\nCall after 5 pm' },
      }),
    ],
    [
      'tail-2',
      leadRow({
        id: 'tail-2',
        createdAt: '2026-02-01T00:00:03.000Z',
        name: 'Gym C',
        probability: 10,
        tags: ['Hotel', 'Gym'],
        description: { markdown: 'Delivery in March' },
      }),
    ],
  ]),
  notes: [
    { id: 'n1', title: 'Call notes', body: 'called', leadIds: ['tail-1'] },
    { id: 'n2', title: null, body: 'met', leadIds: ['tail-2'] },
    { id: 'n3', title: 'Own note', body: 'mine', leadIds: ['head'] },
  ],
  taskLinks: [{ taskId: 't1', leadId: 'tail-1' }],
  attachments: [{ id: 'a1', name: 'quote.pdf', leadId: 'tail-2', files: [{ fileId: 'f1', label: 'quote.pdf' }] }],
});

const snapshot = (state: FakeMergeState) => ({
  head: state.leads.get('head'),
  notes: state.notes
    .map((note) => ({ title: note.title, body: note.body, leadIds: note.leadIds }))
    .sort((left, right) => String(left.title).localeCompare(String(right.title))),
  taskLinks: state.taskLinks,
  attachments: state.attachments,
  deleted: [...state.leads.values()]
    .filter((lead) => lead.deleted === true)
    .map((lead) => lead.id)
    .sort(),
});

const run = (state: FakeMergeState, failAt: { step: keyof MergeApi | null }) =>
  makeMergeLeads(makeFakeMergeApi(state, failAt))(['tail-2', 'head', 'tail-1'], { caller: 'person' });

describe('mergeLeads', () => {
  it('keeps the best lead, moves notes, tasks and files to it, and puts the others in the trash', async () => {
    const state = freshState();

    await expect(run(state, { step: null })).resolves.toEqual({ headId: 'head', tailIds: ['tail-1', 'tail-2'] });
    expect(snapshot(state)).toMatchObject({
      taskLinks: [{ taskId: 't1', leadId: 'head' }],
      attachments: [{ id: 'a1', name: 'quote.pdf (from Gym C)', leadId: 'head', files: [{ fileId: 'f1', label: 'quote.pdf (from Gym C)' }] }],
      deleted: ['tail-1', 'tail-2'],
    });
    expect(state.notes.map((note) => [note.title, note.leadIds])).toEqual([
      ['From Gym B: Call notes', ['head']],
      ['From Gym C', ['head']],
      ['Own note', ['head']],
      ['Merge summary', ['head']],
    ]);
    expect(state.leads.get('head')).toMatchObject({
      priority: 'HIGH',
      tags: ['Gym', 'Hotel'],
      language: 'fr_FR',
      stageId: 'gen-1',
      description: { markdown: 'Wants 12 treadmills\n\nBudget 20k\n\nCall after 5 pm\n\nDelivery in March' },
    });
  });

  it.each(['addNote', 'renameNote', 'moveNoteLinks', 'moveTaskLinks', 'moveAttachment', 'writeHead', 'softDeleteLeads'] as const)(
    'gives the same result when a run stopped at %s is started again',
    async (step) => {
      const clean = freshState();

      await run(clean, { step: null });

      const stopped = freshState();

      await expect(run(stopped, { step })).rejects.toThrow(`stopped at ${step}`);
      await run(stopped, { step: null });

      expect(snapshot(stopped)).toEqual(snapshot(clean));
    },
  );

  it('changes nothing when the user may not change leads', async () => {
    const state = { ...freshState(), rights: { update: false, delete: true } };
    const before = structuredClone(snapshot(state));

    await expect(run(state, { step: null })).rejects.toThrow('not allowed');
    expect(snapshot(state)).toEqual(before);
  });

  it('merges for a user who may change leads but not delete them: the merged-away leads go to the trash all the same', async () => {
    const state = { ...freshState(), rights: { update: true, delete: false } };

    await expect(run(state, { step: null })).resolves.toEqual({ headId: 'head', tailIds: ['tail-1', 'tail-2'] });
    expect(snapshot(state).deleted).toEqual(['tail-1', 'tail-2']);
  });

  it('leaves a note or task the kept lead already has linked once, under its own title', async () => {
    const state = freshState();

    state.notes.push({ id: 'shared', title: 'Visit', body: 'both', leadIds: ['tail-1', 'head'] });
    state.taskLinks.push({ taskId: 't2', leadId: 'head' }, { taskId: 't2', leadId: 'tail-2' });
    await run(state, { step: null });

    expect(state.notes.find((note) => note.id === 'shared')).toMatchObject({ title: 'Visit', leadIds: ['head'] });
    expect(state.taskLinks).toEqual([
      { taskId: 't1', leadId: 'head' },
      { taskId: 't2', leadId: 'head' },
    ]);
  });

  it('refuses one lead, and more than five for a button', async () => {
    const merge = makeMergeLeads(makeFakeMergeApi(freshState(), { step: null }));

    await expect(merge(['head'], { caller: 'person' })).rejects.toThrow('Select at least two leads to merge.');
    await expect(merge(['1', '2', '3', '4', '5', '6'], { caller: 'person' })).rejects.toThrow('Merge at most {max} leads at a time.');
  });

  it('allows any number when the limit is turned off', async () => {
    const state = freshState();

    for (let index = 3; index <= 7; index += 1) {
      state.leads.set(`extra-${index}`, leadRow({ id: `extra-${index}`, createdAt: `2026-02-01T00:00:0${index}.000Z`, name: `Extra ${index}` }));
    }

    const merged = await makeMergeLeads(makeFakeMergeApi(state, { step: null }))([...state.leads.keys()], {
      caller: 'application',
      maxLength: 0,
    });

    expect(merged.tailIds).toHaveLength(7);
  });

  it('refuses when a lead cannot be read', async () => {
    await expect(
      makeMergeLeads(makeFakeMergeApi(freshState(), { step: null }))(['head', 'missing'], { caller: 'person' }),
    ).rejects.toThrow('{count} of the selected leads were not found.');
  });
});
