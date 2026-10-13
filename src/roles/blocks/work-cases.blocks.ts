import { HELPDESK_TICKET_OBJECT_UNIVERSAL_IDENTIFIER } from 'src/helpdesk/helpdesk-universal-identifiers.constant';
import { BLOCK_KEYS } from 'src/roles/blocks/block-keys.constant';
import { type BuildingBlock } from 'src/roles/types/building-block.type';
import { type RowRuleScope } from 'src/roles/types/row-rule-scope.type';
import { type WorkCasesRoleRow } from 'src/roles/types/work-cases-role-row.type';
import { WORK_CASES_ROLE_TABLE } from 'src/roles/work-cases-role-table';

const workCasesBlock = (
  key: string,
  label: string,
  implies: string[],
  column: 'ownDocuments' | 'allDocuments' | 'administrator',
  caseScope: RowRuleScope,
): BuildingBlock => ({
  key,
  label,
  implies,
  objectRights: WORK_CASES_ROLE_TABLE.filter((entry: WorkCasesRoleRow) => entry[column] !== '-').map((entry) => ({
    objectUniversalIdentifier: entry.objectUniversalIdentifier,
    rights: entry[column],
  })),
  opensObjectsOutsidePlatform: false,
  hiddenFields: [],
  permissionFlags: [],
  canAccessAllTools: true,
  rowRules: [{ objectUniversalIdentifier: HELPDESK_TICKET_OBJECT_UNIVERSAL_IDENTIFIER, scope: caseScope }],
});

// A person works the cases where they are the assignee, and the cases nobody holds yet.
export const WORK_CASES_OWN_BLOCK = workCasesBlock(BLOCK_KEYS.workCasesOwn, 'Work cases: Own Documents', [BLOCK_KEYS.employee], 'ownDocuments', 'mineOrUnowned');

export const WORK_CASES_ALL_BLOCK = workCasesBlock(BLOCK_KEYS.workCasesAll, 'Work cases: All Documents', [BLOCK_KEYS.workCasesOwn], 'allDocuments', 'all');

export const WORK_CASES_ADMINISTRATOR_BLOCK = workCasesBlock(
  BLOCK_KEYS.workCasesAdministrator,
  'Work cases: Administrator',
  [BLOCK_KEYS.workCasesAll],
  'administrator',
  'all',
);
