import { readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';

import { BLOCK_KEYS } from 'src/roles/blocks/block-keys.constant';
import { BUILDING_BLOCKS } from 'src/roles/blocks/building-blocks';
import { FIELD_SERVICE_ROLE_TABLE } from 'src/roles/field-service-role-table';
import { ROLE_MODULES } from 'src/roles/role-modules';
import { mixBlocks } from 'src/roles/utils/mix-blocks.util';

type ObjectConfig = { universalIdentifier: string; nameSingular: string };

const objectFiles = (directory: string): string[] =>
  readdirSync(directory, { withFileTypes: true }).flatMap((entry) =>
    entry.isDirectory() ? objectFiles(join(directory, entry.name)) : entry.name.endsWith('.object.ts') ? [join(directory, entry.name)] : [],
  );

let FIELD_SERVICE_OBJECTS: ObjectConfig[] = [];

beforeAll(async () => {
  const objects = await Promise.all(
    objectFiles('src').map(async (file) => ((await import(resolve(file))) as { default: { config: ObjectConfig } }).default.config),
  );

  FIELD_SERVICE_OBJECTS = objects.filter((object) => /^(fsm|res(Region|District|Branch|Territory)$)/.test(object.nameSingular));
});

const rowOf = (nameSingular: string) =>
  FIELD_SERVICE_ROLE_TABLE.find(
    (row) => row.objectUniversalIdentifier === FIELD_SERVICE_OBJECTS.find((object) => object.nameSingular === nameSingular)?.universalIdentifier,
  );

const mix = (keys: string[]) => mixBlocks(keys, BUILDING_BLOCKS, ROLE_MODULES);

describe('field service role table', () => {
  it('gives every field service and service area object a row, once', () => {
    const listed = FIELD_SERVICE_ROLE_TABLE.map((row) => row.objectUniversalIdentifier);

    expect(FIELD_SERVICE_OBJECTS.filter((object) => !listed.includes(object.universalIdentifier)).map((object) => object.nameSingular)).toEqual([]);
    expect(listed.filter((id, index) => listed.indexOf(id) !== index)).toEqual([]);
  });

  it('lets the dispatcher delete orders, nobody delete locations, and only the manager change teams, templates and equipment', () => {
    expect(rowOf('fsmOrder')).toMatchObject({ userOwn: 'RU', user: 'RU', dispatcher: 'RUD', manager: 'RUD' });
    expect(rowOf('fsmLocation')).toMatchObject({ userOwn: 'RU', user: 'RU', dispatcher: 'RU', manager: 'RU' });
    expect(rowOf('fsmPerson')).toMatchObject({ userOwn: 'RU', dispatcher: 'RU', manager: 'RUD' });
    expect(rowOf('fsmTeam')).toMatchObject({ userOwn: 'R', dispatcher: 'R', manager: 'RUD' });
    expect(rowOf('fsmEquipment')).toMatchObject({ userOwn: 'R', dispatcher: 'R', manager: 'RUD' });
    expect(rowOf('resTerritory')).toMatchObject({ userOwn: 'RUD', manager: 'RUD' });
  });

  it('keeps the checklist from the own-documents level, lets the User level work it, and lets only the manager delete items', () => {
    expect(rowOf('fsmActivity')).toMatchObject({ userOwn: '-', user: 'RU', dispatcher: 'RU', manager: 'RUD' });
  });
});

describe('field service blocks', () => {
  it('includes the lower levels, and Employee at the bottom', () => {
    expect(mix([BLOCK_KEYS.fieldServiceManager]).blockKeys).toEqual(
      [
        BLOCK_KEYS.employee,
        BLOCK_KEYS.fieldServiceUserOwn,
        BLOCK_KEYS.fieldServiceUser,
        BLOCK_KEYS.fieldServiceDispatcher,
        BLOCK_KEYS.fieldServiceManager,
      ].sort(),
    );
  });

  it('filters no order by worker at any level', () => {
    expect(mix([BLOCK_KEYS.fieldServiceUserOwn]).rowRules).toEqual({});
  });
});
