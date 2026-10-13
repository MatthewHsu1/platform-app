import { readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';

import { HELPDESK_TICKET_OBJECT_UNIVERSAL_IDENTIFIER } from 'src/helpdesk/helpdesk-universal-identifiers.constant';
import { BLOCK_KEYS } from 'src/roles/blocks/block-keys.constant';
import { BUILDING_BLOCKS } from 'src/roles/blocks/building-blocks';
import { ROLE_MODULES } from 'src/roles/role-modules';
import { mixBlocks } from 'src/roles/utils/mix-blocks.util';
import { WORK_CASES_ROLE_TABLE } from 'src/roles/work-cases-role-table';

type ObjectConfig = { universalIdentifier: string; nameSingular: string };

const objectFiles = (directory: string): string[] =>
  readdirSync(directory, { withFileTypes: true }).flatMap((entry) =>
    entry.isDirectory() ? objectFiles(join(directory, entry.name)) : entry.name.endsWith('.object.ts') ? [join(directory, entry.name)] : [],
  );

let WORK_CASE_OBJECTS: ObjectConfig[] = [];

beforeAll(async () => {
  const objects = await Promise.all(
    objectFiles('src').map(async (file) => ((await import(resolve(file))) as { default: { config: ObjectConfig } }).default.config),
  );

  WORK_CASE_OBJECTS = objects.filter((object) => /^(helpdesk|resource)/.test(object.nameSingular));
});

const rowOf = (nameSingular: string) =>
  WORK_CASES_ROLE_TABLE.find(
    (row) => row.objectUniversalIdentifier === WORK_CASE_OBJECTS.find((object) => object.nameSingular === nameSingular)?.universalIdentifier,
  );

const mix = (keys: string[]) => mixBlocks(keys, BUILDING_BLOCKS, ROLE_MODULES);

describe('work cases role table', () => {
  it('gives every work case, service level and working hours object a row, once', () => {
    const listed = WORK_CASES_ROLE_TABLE.map((row) => row.objectUniversalIdentifier);

    expect(WORK_CASE_OBJECTS.filter((object) => !listed.includes(object.universalIdentifier)).map((object) => object.nameSingular)).toEqual([]);
    expect(listed.filter((id, index) => listed.indexOf(id) !== index)).toEqual([]);
  });

  it('lets whoever works on cases change them, tag them and relate them, and only the administrator change the tables they point at', () => {
    expect(rowOf('helpdeskTicket')).toMatchObject({ ownDocuments: 'RU', allDocuments: 'RU', administrator: 'RUD' });
    expect(rowOf('helpdeskTicketTagRel')).toMatchObject({ ownDocuments: 'RUD', allDocuments: 'RUD', administrator: 'RUD' });
    expect(rowOf('helpdeskTicketRelated')).toMatchObject({ ownDocuments: 'RUD', allDocuments: 'RUD', administrator: 'RUD' });
    expect(rowOf('helpdeskTicketStage')).toMatchObject({ ownDocuments: 'R', allDocuments: 'R', administrator: 'RUD' });
    expect(rowOf('helpdeskTicketTeamMember')).toMatchObject({ ownDocuments: 'R', allDocuments: 'R', administrator: 'RUD' });
    expect(rowOf('resourceCalendar')).toMatchObject({ ownDocuments: 'R', allDocuments: 'R', administrator: 'RUD' });
  });
});

describe('work cases blocks', () => {
  it('Own Documents works the cases assigned to the person and the cases nobody holds; the wider levels see every case', () => {
    expect(mix([BLOCK_KEYS.workCasesOwn]).rowRules).toEqual({ [HELPDESK_TICKET_OBJECT_UNIVERSAL_IDENTIFIER]: 'mineOrUnowned' });
    expect(mix([BLOCK_KEYS.workCasesAll]).rowRules).toEqual({ [HELPDESK_TICKET_OBJECT_UNIVERSAL_IDENTIFIER]: 'all' });
    expect(mix([BLOCK_KEYS.workCasesAdministrator]).rowRules).toEqual({ [HELPDESK_TICKET_OBJECT_UNIVERSAL_IDENTIFIER]: 'all' });
  });

  it('includes the lower levels, and Employee at the bottom', () => {
    expect(mix([BLOCK_KEYS.workCasesAdministrator]).blockKeys).toEqual(
      [BLOCK_KEYS.employee, BLOCK_KEYS.workCasesOwn, BLOCK_KEYS.workCasesAll, BLOCK_KEYS.workCasesAdministrator].sort(),
    );
  });
});
