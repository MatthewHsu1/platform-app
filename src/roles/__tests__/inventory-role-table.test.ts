import { readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';

import { INVENTORY_ROLE_TABLE } from 'src/roles/inventory-role-table';

type ObjectConfig = { universalIdentifier: string; nameSingular: string };

const objectFiles = (directory: string): string[] =>
  readdirSync(directory, { withFileTypes: true }).flatMap((entry) =>
    entry.isDirectory()
      ? objectFiles(join(directory, entry.name))
      : entry.name.endsWith('.object.ts')
        ? [join(directory, entry.name)]
        : [],
  );

// Every object the app defines, read from its object files.
let APP_OBJECTS: ObjectConfig[] = [];

beforeAll(async () => {
  APP_OBJECTS = await Promise.all(
    objectFiles('src').map(async (file) => ((await import(resolve(file))) as { default: { config: ObjectConfig } }).default.config),
  );
});

// Objects of the CRM and sales team modules: the inventory roles keep the member defaults on them.
const OUTSIDE_INVENTORY = [
  'crmLead',
  'crmLostReason',
  'crmStage',
  'crmRecurringPlan',
  'crmTeam',
  'crmTeamMember',
  'crmStageTeam',
  'utmSource',
  'utmMedium',
  'utmCampaign',
];

const rowOf = (nameSingular: string) => {
  const object = APP_OBJECTS.find((candidate) => candidate.nameSingular === nameSingular);

  return INVENTORY_ROLE_TABLE.find((row) => row.objectUniversalIdentifier === object?.universalIdentifier);
};

describe('inventory role table', () => {
  it('gives every app object a row, unless it belongs to the CRM module', () => {
    const listed = new Set(INVENTORY_ROLE_TABLE.map((row) => row.objectUniversalIdentifier));

    expect(
      APP_OBJECTS.filter((object) => !listed.has(object.universalIdentifier) && !OUTSIDE_INVENTORY.includes(object.nameSingular)).map(
        (object) => object.nameSingular,
      ),
    ).toEqual([]);
  });

  it('lists each object once', () => {
    const ids = INVENTORY_ROLE_TABLE.map((row) => row.objectUniversalIdentifier);

    expect(ids.filter((id, index) => ids.indexOf(id) !== index)).toEqual([]);
  });

  it('lets a stock user process transfers, edit but not delete moves, and only read the warehouse setup and reordering rules', () => {
    expect(rowOf('stockPicking')).toMatchObject({ user: 'RUD', administrator: 'RUD', productsCreate: '-' });
    expect(rowOf('stockMove')).toMatchObject({ user: 'RU', administrator: 'RUD', productsCreate: '-' });
    expect(rowOf('stockWarehouse')).toMatchObject({ user: 'R', administrator: 'RUD', productsCreate: 'R' });
    expect(rowOf('stockWarehouseOrderpoint')).toMatchObject({ user: 'R', administrator: 'RUD', productsCreate: '-' });
  });

  it('lets whoever may read moves read their chain links, so the reports see the whole chain', () => {
    expect(rowOf('stockMoveMoveRel')).toMatchObject({ user: 'RUD', administrator: 'RUD', productsCreate: '-' });
  });

  it('keeps the lot compensation rows read-only for everyone who may read lots', () => {
    expect(rowOf('stockLotCompensation')).toMatchObject({ user: 'R', administrator: 'R', productsCreate: '-' });
  });
});
