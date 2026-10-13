import { describe, expect, it } from 'vitest';

import { type UtmTriggerApi } from 'src/utm/types/utm-trigger-api.type';
import { makeRunCampaignTrigger, makeRunUtmNameTrigger, makeRunUtmStageTrigger, makeRunUtmTagTrigger } from 'src/utm/run-utm-triggers';
import { MEDIUM_NAME_RULES, SOURCE_NAME_RULES } from 'src/utm/utm-name-rules';
import { UTM_MESSAGES } from 'src/utm/utm-messages';

type Row = { id: string; name?: string | null; active?: boolean; seedKey?: string | null; deleted?: boolean; stageId?: string | null; sequence?: number };

const STAFF: { source: string; workspaceMemberId: string | null } = { source: 'MANUAL', workspaceMemberId: 'm1' };
const APP = { source: 'APPLICATION', workspaceMemberId: null };

const makeFake = (tables: Record<string, Row[]>) => {
  const store = new Map(Object.entries(tables).map(([object, rows]) => [object, new Map(rows.map((row) => [row.id, { ...row }]))]));
  const calls: string[] = [];
  const table = (object: string) => store.get(object) ?? new Map<string, Row>();
  const live = (object: string) => [...table(object).values()].filter((row) => row.deleted !== true);
  const asUtmRow = (row: Row) => ({ id: row.id, name: row.name ?? null, active: row.active ?? true });

  const api: UtmTriggerApi = {
    findNamesLike: async (object, bases) =>
      live(object)
        .filter((row) => bases.some((base) => (row.name ?? '').toLowerCase().includes(base.toLowerCase())))
        .map(asUtmRow),
    findByName: async (object, name) => live(object).filter((row) => row.name === name).map(asUtmRow),
    update: async (object, id, data) => {
      calls.push(`update ${id} ${JSON.stringify(data)}`);
      Object.assign(table(object).get(id) ?? {}, data);
    },
    putBack: async (_object, id, data, reason) => {
      calls.push(`put back ${id} ${JSON.stringify(data)}: ${reason}`);
    },
    destroy: async (object, ids) => {
      calls.push(`destroy ${ids.join(',')}`);
      ids.forEach((id) => table(object).delete(id));
    },
    stillDeleted: async (object, ids) =>
      ids.flatMap((id) => {
        const row = table(object).get(id);

        return row?.deleted === true ? [{ id, seedKey: row.seedKey ?? null }] : [];
      }),
    restoreWithNote: async (_object, id, reason) => {
      calls.push(`restore ${id}: ${reason}`);
    },
    firstStageId: async () => [...live('utmStage')].sort((left, right) => (left.sequence ?? 0) - (right.sequence ?? 0))[0]?.id ?? null,
    stageIdsInUse: async (stageIds) => new Set(live('utmCampaign').flatMap((row) => (typeof row.stageId === 'string' && stageIds.includes(row.stageId) ? [row.stageId] : []))),
    clearOnLeads: async (field, ids) => {
      calls.push(`clear ${field} ${ids.join(',')}`);
    },
    destroyTagLinks: async (field, ids) => {
      calls.push(`destroy links ${field} ${ids.join(',')}`);
    },
    pickColor: () => 'red',
    memberLocale: async () => 'en',
    translate: (_locale, message, values = {}) => message.replace(/\{(\w+)\}/g, (_whole, name: string) => String(values[name] ?? '')),
  };

  return { api, calls, table };
};

const created = (id: string, after: Record<string, unknown>, workspaceMemberId = 'm1') => ({
  recordId: id,
  workspaceMemberId,
  properties: { after: { id, updatedBy: STAFF, ...after } },
});
const updated = (id: string, before: Record<string, unknown>, after: Record<string, unknown>, updatedFields: string[], actor = STAFF) => ({
  recordId: id,
  workspaceMemberId: 'm1',
  properties: { before: { id, ...before }, after: { id, ...before, ...after, updatedBy: actor }, updatedFields },
});
const deleted = (id: string) => ({ recordId: id, workspaceMemberId: 'm1', properties: { before: { id } } });

describe('campaign trigger', () => {
  it('numbers new campaigns against the active ones, makes the creator responsible and puts them in the first stage', async () => {
    const { api, calls } = makeFake({
      utmCampaign: [{ id: 'old', name: 'Promo' }, { id: 'c1', name: 'Promo' }, { id: 'c2', name: 'Promo' }],
      utmStage: [{ id: 'later', sequence: 20 }, { id: 'new', sequence: 10 }],
    });

    await makeRunCampaignTrigger(api)({ operation: 'created', events: [created('c1', { name: 'Promo' }), created('c2', { name: 'Promo' })] });

    expect(calls).toEqual([
      'update c1 {"name":"Promo [2]","responsibleId":"m1","stageId":"new"}',
      'update c2 {"name":"Promo [3]","responsibleId":"m1","stageId":"new"}',
    ]);
  });

  it('removes a new campaign whose name an archived campaign holds and says so in the error', async () => {
    const { api, calls } = makeFake({ utmCampaign: [{ id: 'old', name: 'Old', active: false }, { id: 'c1', name: 'Old' }], utmStage: [] });

    await expect(makeRunCampaignTrigger(api)({ operation: 'created', events: [created('c1', { name: 'Old', responsibleId: 'm2' })] })).rejects.toThrow(
      'an archived record already has the name "Old"',
    );
    expect(calls).toEqual(['destroy c1']);
  });

  it('removes every campaign of a save when one of them takes an archived campaign name', async () => {
    const { api, calls } = makeFake({
      utmCampaign: [{ id: 'archived', name: 'Archived Campaign', active: false }, { id: 'c1', name: 'UTM 1' }, { id: 'c2', name: 'Archived Campaign' }],
      utmStage: [{ id: 'new', sequence: 10 }],
    });

    await expect(
      makeRunCampaignTrigger(api)({ operation: 'created', events: [created('c1', { name: 'UTM 1' }), created('c2', { name: 'Archived Campaign' })] }),
    ).rejects.toThrow('an archived record already has the name "Archived Campaign"');
    expect(calls).toEqual(['destroy c1,c2']);
  });

  it('puts back a staff save that empties the responsible, and leaves the app own writes alone', async () => {
    const { api, calls } = makeFake({ utmCampaign: [] });
    const run = makeRunCampaignTrigger(api);
    const before = { name: 'Spring', responsibleId: 'm1', stageId: 's' };

    await run({ operation: 'updated', events: [updated('c1', before, { responsibleId: null }, ['responsible', 'responsibleId'])] });
    await run({ operation: 'updated', events: [updated('c2', before, { responsibleId: null }, ['responsibleId'], APP)] });

    expect(calls).toEqual([`put back c1 {"responsibleId":"m1"}: ${UTM_MESSAGES.requiredEmptied}`]);
  });

  it('puts back a staff rename to a name an archived campaign holds', async () => {
    const { api, calls } = makeFake({ utmCampaign: [{ id: 'other', name: 'Winter', active: false }, { id: 'c1', name: 'Winter' }] });

    await makeRunCampaignTrigger(api)({
      operation: 'updated',
      events: [updated('c1', { name: 'Spring', responsibleId: 'm1', stageId: 's' }, { name: 'Winter' }, ['name'])],
    });

    expect(calls).toEqual(['put back c1 {"name":"Spring"}: The name "Winter" is already used. The change was undone.']);
  });

  it('numbers the first name typed into a campaign the UI saved without one, as on a create', async () => {
    const { api, calls } = makeFake({ utmCampaign: [{ id: 'old', name: 'Promo' }, { id: 'old2', name: 'Promo [2]' }, { id: 'c1', name: 'Promo' }, { id: 'c2', name: 'Summer' }] });
    const before = { name: '', responsibleId: 'm1', stageId: 's' };

    await makeRunCampaignTrigger(api)({
      operation: 'updated',
      events: [updated('c1', before, { name: 'Promo' }, ['name']), updated('c2', { ...before, name: null }, { name: 'Summer' }, ['name'])],
    });

    expect(calls).toEqual(['update c1 {"name":"Promo [3]"}']);
  });

  it('empties again the first name of a campaign when an archived campaign holds it', async () => {
    const { api, calls } = makeFake({ utmCampaign: [{ id: 'old', name: 'Winter', active: false }, { id: 'c1', name: 'Winter' }] });

    await makeRunCampaignTrigger(api)({
      operation: 'updated',
      events: [updated('c1', { name: '', responsibleId: 'm1', stageId: 's' }, { name: 'Winter' }, ['name'])],
    });

    expect(calls).toEqual(['put back c1 {"name":null}: The name "Winter" is already used. The change was undone.']);
  });

  it('writes nothing when its own name write comes back', async () => {
    const { api, calls } = makeFake({ utmCampaign: [{ id: 'c1', name: 'Promo [2]' }, { id: 'old', name: 'Promo' }] });

    await makeRunCampaignTrigger(api)({
      operation: 'updated',
      events: [updated('c1', { name: 'Promo', responsibleId: 'm1', stageId: 's' }, { name: 'Promo [2]' }, ['name'], APP)],
    });

    expect(calls).toEqual([]);
  });

  it('takes a deleted campaign off its leads and removes its tag links, unless it is back', async () => {
    const { api, calls } = makeFake({ utmCampaign: [{ id: 'gone', deleted: true }, { id: 'back' }] });

    await makeRunCampaignTrigger(api)({ operation: 'deleted', events: [deleted('gone'), deleted('back')] });

    expect(calls).toEqual(['clear campaignId gone', 'destroy links campaignId gone']);
  });
});

describe('source and medium triggers', () => {
  it('counts an archived source when it numbers a new one', async () => {
    const { api, calls } = makeFake({ utmSource: [{ id: 'old', name: 'UTM new', active: false }, { id: 's1', name: 'UTM new' }] });

    await makeRunUtmNameTrigger(SOURCE_NAME_RULES, api)({ operation: 'created', events: [created('s1', { name: 'UTM new' })] });

    expect(calls).toEqual(['update s1 {"name":"UTM new [2]"}']);
  });

  it('removes a new medium whose name an archived medium holds', async () => {
    const { api, calls } = makeFake({ utmMedium: [{ id: 'old', name: 'Email', active: false }, { id: 'x', name: 'Email' }] });

    await expect(makeRunUtmNameTrigger(MEDIUM_NAME_RULES, api)({ operation: 'created', events: [created('x', { name: 'Email' })] })).rejects.toThrow(
      'already has the name "Email"',
    );
    expect(calls).toEqual(['destroy x']);
  });

  it('keeps the Referral source and takes another deleted source off its leads', async () => {
    const { api, calls } = makeFake({
      utmSource: [
        { id: 'referral', name: 'Referral', seedKey: 'utm.utm_source_referral', deleted: true },
        { id: 'monster', name: 'Monster', seedKey: 'utm.utm_source_monster', deleted: true },
      ],
    });

    await makeRunUtmNameTrigger(SOURCE_NAME_RULES, api)({ operation: 'deleted', events: [deleted('referral'), deleted('monster')] });

    expect(calls).toEqual([`restore referral: ${UTM_MESSAGES.referralSource}`, 'clear sourceId monster']);
  });

  it('keeps the six mediums other parts rely on', async () => {
    const { api, calls } = makeFake({
      utmMedium: [
        { id: 'email', seedKey: 'utm.utm_medium_email', deleted: true },
        { id: 'phone', seedKey: 'utm.utm_medium_phone', deleted: true },
      ],
    });

    await makeRunUtmNameTrigger(MEDIUM_NAME_RULES, api)({ operation: 'deleted', events: [deleted('email'), deleted('phone')] });

    expect(calls).toEqual([`restore email: ${UTM_MESSAGES.protectedMedium}`, 'clear mediumId phone']);
  });

  it('numbers the first name typed into a source the UI saved without one, archived sources counted', async () => {
    const { api, calls } = makeFake({ utmSource: [{ id: 'old', name: 'UTM new', active: false }, { id: 's1', name: 'UTM new' }] });

    await makeRunUtmNameTrigger(SOURCE_NAME_RULES, api)({ operation: 'updated', events: [updated('s1', { name: '' }, { name: 'UTM new' }, ['name'])] });

    expect(calls).toEqual(['update s1 {"name":"UTM new [2]"}']);
  });

  it('numbers the first name of a medium against the active ones and empties it again when an archived one holds it', async () => {
    const { api, calls } = makeFake({
      utmMedium: [{ id: 'web', name: 'Website' }, { id: 'old', name: 'Email', active: false }, { id: 'm1', name: 'Website' }, { id: 'm2', name: 'Email' }],
    });

    await makeRunUtmNameTrigger(MEDIUM_NAME_RULES, api)({
      operation: 'updated',
      events: [updated('m1', { name: null }, { name: 'Website' }, ['name']), updated('m2', { name: '' }, { name: 'Email' }, ['name'])],
    });

    expect(calls).toEqual(['update m1 {"name":"Website [2]"}', 'put back m2 {"name":null}: The name "Email" is already used. The change was undone.']);
  });

  it('puts back a staff rename of a medium to a taken name, archived ones included', async () => {
    const { api, calls } = makeFake({ utmMedium: [{ id: 'old', name: 'Banner', active: false }, { id: 'm', name: 'Banner' }] });

    await makeRunUtmNameTrigger(MEDIUM_NAME_RULES, api)({ operation: 'updated', events: [updated('m', { name: 'Poster' }, { name: 'Banner' }, ['name'])] });

    expect(calls).toEqual(['put back m {"name":"Poster"}: The name "Banner" is already used. The change was undone.']);
  });
});

describe('campaign stage and tag triggers', () => {
  it('keeps a stage an archived campaign is in and lets an unused one go', async () => {
    const { api, calls } = makeFake({
      utmStage: [{ id: 'used', deleted: true }, { id: 'free', deleted: true }],
      utmCampaign: [{ id: 'c', stageId: 'used', active: false }],
    });

    await makeRunUtmStageTrigger(api)({ operation: 'deleted', events: [deleted('used'), deleted('free')] });

    expect(calls).toEqual([`restore used: ${UTM_MESSAGES.stageInUse}`]);
  });

  it('colours a new tag that has none and removes the links of a deleted tag', async () => {
    const { api, calls } = makeFake({ utmTag: [{ id: 't1' }, { id: 't2' }, { id: 'gone', deleted: true }] });
    const run = makeRunUtmTagTrigger(api);

    await run({ operation: 'created', events: [created('t1', { color: '' }), created('t2', { color: 'blue' })] });
    await run({ operation: 'deleted', events: [deleted('gone')] });

    expect(calls).toEqual(['update t1 {"color":"red"}', 'destroy links tagId gone']);
  });
});
