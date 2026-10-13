import { describe, expect, it } from 'vitest';

import { makeConvertMany } from 'src/crm/lead/actions/make-convert-many';
import { type ConvertManyApi } from 'src/crm/lead/actions/types/convert-many-api.type';
import { type ConvertManyInput } from 'src/crm/lead/actions/types/convert-many-input.type';
import { leadRow } from 'src/crm/lead/merge/utils/__tests__/fixtures/lead-row.fixture';
import { type LeadRow } from 'src/crm/lead/types/lead-row.type';
import { UserError } from 'src/shared/user-error';

const at = (second: number) => `2026-02-01T00:00:${String(second).padStart(2, '0')}.000Z`;

// Leads share a "group" letter when they are duplicates of each other. A
// merge keeps the alphabetically first lead and trashes the others.
const makeWorld = (
  groups: Record<string, string>,
  { refuseRightsFor = [], lost = [] }: { refuseRightsFor?: string[]; lost?: string[] } = {},
) => {
  const leads = new Map<string, LeadRow>(
    Object.keys(groups).map((id, index) => [
      id,
      leadRow({ id, createdAt: at(index + 1), name: id, wonStatus: lost.includes(id) ? 'LOST' : 'PENDING' }),
    ]),
  );
  const deleted = new Set<string>();
  const merges: string[][] = [];
  const converted: string[][] = [];
  const checked: string[][] = [];
  const runIds: string[] = [];
  const stop = { atConversion: false };
  const api: ConvertManyApi = {
    readLeads: async (ids) => ({
      inPlay: ids.filter((id) => !deleted.has(id)).map((id) => leads.get(id) as LeadRow),
      trashed: ids.filter((id) => deleted.has(id)).map((id) => leads.get(id) as LeadRow),
    }),
    findDuplicates: async (lead) =>
      [...leads.values()].filter(
        (other) => !deleted.has(other.id) && other.wonStatus === 'PENDING' && groups[other.id] === groups[lead.id],
      ),
    mergedHead: async (group) => [...group].sort((left, right) => left.id.localeCompare(right.id))[0] ?? null,
    requireCustomerRights: async (list) => {
      checked.push(list.map((lead) => lead.id).sort());
      if (list.some((lead) => refuseRightsFor.includes(lead.id))) {
        throw new UserError('Your role does not allow this.');
      }
    },
    mergeLeads: async (ids) => {
      merges.push([...ids].sort());
      const [headId, ...tails] = [...ids].sort();

      tails.forEach((id) => deleted.add(id));

      return { headId };
    },
    convertAndAllocate: async (list, options) => {
      if (stop.atConversion) {
        stop.atConversion = false;
        throw new Error('stopped during conversion');
      }
      converted.push(list.map((lead) => lead.id));
      runIds.push(options.runId);
    },
  };

  return { api, deleted, merges, converted, checked, runIds, stop };
};

const input = (leadIds: string[]): ConvertManyInput => ({
  leadIds,
  deduplicate: true,
  customerAction: 'EACH_EXIST_OR_CREATE',
  personId: null,
  salespersonIds: [],
  teamId: null,
  force: false,
  runId: 'run-1',
});

describe('convertMany', () => {
  it('merges each group of duplicates, outside the selection too, then converts what is left', async () => {
    const world = makeWorld({ a: 'g1', 'a-dup': 'g1', b: 'g2', 'b-dup-0': 'g3', 'b-dup-1': 'g3', c: 'g4' });

    await expect(makeConvertMany(world.api)(input(['c', 'a', 'b']))).resolves.toEqual({ leadIds: ['c', 'b', 'a'] });
    expect(world.merges).toEqual([['a', 'a-dup']]);
    expect(world.converted).toEqual([['c', 'b', 'a']]);
    expect(world.runIds).toEqual(['run-1']);
  });

  it('refuses before any merge when one group holds more than five leads', async () => {
    const world = makeWorld({ a: 'g1', a2: 'g1', a3: 'g1', a4: 'g1', a5: 'g1', a6: 'g1', b: 'g2', 'b-dup': 'g2' });

    await expect(makeConvertMany(world.api)(input(['b', 'a']))).rejects.toThrow('more than {max} duplicates');
    expect(world.merges).toEqual([]);
  });

  it('checks the customer rights of every lead to convert, merged or alone, before any merge', async () => {
    const world = makeWorld({ a: 'g1', 'a-dup': 'g1', b: 'g2', c: 'g3' }, { lost: ['c'] });

    await makeConvertMany(world.api)(input(['a', 'b', 'c']));

    expect(world.checked).toEqual([['a', 'b']]);
  });

  it.each([
    ['a lead kept by a merge', 'a'],
    ['a lead without duplicates', 'b'],
  ])('refuses before any merge when the user may not make the customer of %s', async (_case, refused) => {
    const world = makeWorld({ a: 'g1', 'a-dup': 'g1', b: 'g2' }, { refuseRightsFor: [refused] });

    await expect(makeConvertMany(world.api)(input(['a', 'b']))).rejects.toThrow('Your role does not allow this.');
    expect([world.merges, world.converted]).toEqual([[], []]);
  });

  it('ends a selected lead and its selected duplicates as one lead', async () => {
    const world = makeWorld({ l1: 'g1', d1: 'g1', d2: 'g1' });

    await expect(makeConvertMany(world.api)(input(['l1', 'd1', 'd2']))).resolves.toEqual({ leadIds: ['d1'] });
    expect(world.converted).toEqual([['d1']]);
  });

  it('merges nothing more when started again', async () => {
    const world = makeWorld({ a: 'g1', 'a-dup': 'g1', c: 'g4' });
    const convertMany = makeConvertMany(world.api);

    await convertMany(input(['a', 'a-dup', 'c']));
    await convertMany(input(['a', 'a-dup', 'c']));
    await convertMany(input(['a', 'c']));

    expect(world.merges).toEqual([['a', 'a-dup']]);
    expect(world.converted).toEqual([
      ['c', 'a'],
      ['c', 'a'],
      ['a', 'c'],
    ]);
  });

  it('converts the lead a merge kept outside the selection when started again after a stop during conversion', async () => {
    const world = makeWorld({ a: 'g1', 'a-dup': 'g1', c: 'g4' });
    const convertMany = makeConvertMany(world.api);

    world.stop.atConversion = true;
    await expect(convertMany(input(['a-dup', 'c']))).rejects.toThrow('stopped during conversion');
    await expect(convertMany(input(['a-dup', 'c']))).resolves.toEqual({ leadIds: ['c', 'a'] });

    expect(world.merges).toEqual([['a', 'a-dup']]);
    expect(world.converted).toEqual([['c', 'a']]);
  });

  it('converts without searching when deduplication is off', async () => {
    const world = makeWorld({ a: 'g1', 'a-dup': 'g1' });

    await makeConvertMany(world.api)({ ...input(['a']), deduplicate: false });

    expect(world.merges).toEqual([]);
    expect(world.converted).toEqual([['a']]);
  });
});
