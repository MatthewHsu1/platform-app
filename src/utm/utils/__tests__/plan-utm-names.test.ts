import { describe, expect, it } from 'vitest';

import { emptiedRequiredFields, findNameClash, planCampaignDefaults, planUniqueNameCreate } from 'src/utm/utils/plan-utm-names.util';

const created = (id: string, patch: { name?: string | null; responsibleId?: string | null; stageId?: string | null; creatorMemberId?: string | null }) => ({
  id,
  name: null,
  responsibleId: null,
  stageId: null,
  creatorMemberId: 'MEMBER',
  ...patch,
});

describe('planCampaignDefaults', () => {
  const plan = (rows: ReturnType<typeof created>[], existingActiveNames: string[] = [], archivedNames: string[] = []) =>
    planCampaignDefaults({ created: rows, existingActiveNames, archivedNames, firstStageId: 'NEW' });

  it('gives a new campaign its creator as responsible and the first stage', () => {
    expect(plan([created('a', { name: 'Spring' })])).toEqual([{ id: 'a', kind: 'write', data: { responsibleId: 'MEMBER', stageId: 'NEW' } }]);
  });

  it('numbers an identifier that is taken', () => {
    expect(plan([created('d', { name: 'UTM ne' })], ['UTM ne', 'UTM ne [2]'])).toEqual([
      { id: 'd', kind: 'write', data: { name: 'UTM ne [3]', responsibleId: 'MEMBER', stageId: 'NEW' } },
    ]);
  });

  it('numbers campaigns made together', () => {
    expect(plan([created('e', { name: 'Promo' }), created('f', { name: 'Promo' })]).map((row) => row.kind === 'write' && (row.data.name ?? 'kept'))).toEqual([
      'kept',
      'Promo [2]',
    ]);
  });

  it('keeps a chosen responsible and stage and leaves the responsible empty when nobody made it', () => {
    expect(plan([created('g', { name: 'G', responsibleId: 'OTHER', stageId: 'DONE', creatorMemberId: null })])).toEqual([
      { id: 'g', kind: 'write', data: {} },
    ]);
    expect(plan([created('h', { name: 'H', creatorMemberId: null })])).toEqual([{ id: 'h', kind: 'write', data: { stageId: 'NEW' } }]);
  });

  it('refuses a campaign whose identifier an archived campaign holds', () => {
    expect(plan([created('i', { name: 'Old' })], [], ['Old'])).toEqual([{ id: 'i', kind: 'refuse' }]);
  });
});

describe('planUniqueNameCreate', () => {
  it('numbers sources and mediums made with a taken name', () => {
    expect(
      planUniqueNameCreate({
        created: [
          { id: '1', name: 'UTM 1' },
          { id: '2', name: 'UTM new' },
          { id: '3', name: 'UTM new [0]' },
        ],
        existingNames: ['UTM new'],
        archivedNames: [],
      }),
    ).toEqual([
      { id: '2', kind: 'write', name: 'UTM new [2]' },
      { id: '3', kind: 'write', name: 'UTM new [3]' },
    ]);
  });

  it('refuses a name an archived row holds', () => {
    expect(planUniqueNameCreate({ created: [{ id: '1', name: 'Email' }], existingNames: [], archivedNames: ['Email'] })).toEqual([{ id: '1', kind: 'refuse' }]);
  });
});

describe('findNameClash', () => {
  it('finds another row with exactly the same name', () => {
    expect(findNameClash('Newsletter', [{ id: 'a', name: 'Newsletter' }], 'b')).toBe(true);
  });

  it('ignores the row itself and other cases', () => {
    expect(findNameClash('Newsletter', [{ id: 'a', name: 'Newsletter' }], 'a')).toBe(false);
    expect(findNameClash('Newsletter', [{ id: 'a', name: 'newsletter' }], 'b')).toBe(false);
  });
});

describe('emptiedRequiredFields', () => {
  it('lists the required campaign fields a save emptied', () => {
    expect(emptiedRequiredFields({ name: 'Spring', responsibleId: 'U', stageId: 'S' }, { name: '', responsibleId: null, stageId: 'S' })).toEqual([
      'name',
      'responsibleId',
    ]);
  });

  it('is empty when nothing required was emptied', () => {
    expect(emptiedRequiredFields({ name: 'A', responsibleId: null, stageId: 'S' }, { name: 'B', responsibleId: null, stageId: 'S' })).toEqual([]);
  });
});
