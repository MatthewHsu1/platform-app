import { CRM_LEAD_OBJECT_UNIVERSAL_IDENTIFIER } from 'src/crm/crm-universal-identifiers.constant';
import { BLOCK_KEYS } from 'src/roles/blocks/block-keys.constant';
import { SALES_ROLE_TABLE } from 'src/roles/sales-role-table';
import { type BuildingBlock } from 'src/roles/types/building-block.type';
import { type RowRuleScope } from 'src/roles/types/row-rule-scope.type';
import { type SalesRoleRow } from 'src/roles/types/sales-role-row.type';

const salesBlock = (
  key: string,
  label: string,
  implies: string[],
  column: 'ownDocuments' | 'allDocuments' | 'administrator',
  leadScope: RowRuleScope,
): BuildingBlock => ({
  key,
  label,
  implies,
  objectRights: SALES_ROLE_TABLE.filter((entry: SalesRoleRow) => entry[column] !== '-').map((entry) => ({
    objectUniversalIdentifier: entry.objectUniversalIdentifier,
    rights: entry[column],
  })),
  opensObjectsOutsidePlatform: false,
  hiddenFields: [],
  permissionFlags: [],
  canAccessAllTools: true,
  rowRules: [{ objectUniversalIdentifier: CRM_LEAD_OBJECT_UNIVERSAL_IDENTIFIER, scope: leadScope }],
});

// A rep works the leads where they are the salesperson, and the leads nobody owns yet.
export const SALES_OWN_BLOCK = salesBlock(BLOCK_KEYS.salesOwn, 'Sales: Own Documents', [BLOCK_KEYS.employee], 'ownDocuments', 'mineOrUnowned');

export const SALES_ALL_BLOCK = salesBlock(BLOCK_KEYS.salesAll, 'Sales: All Documents', [BLOCK_KEYS.salesOwn], 'allDocuments', 'all');

export const SALES_ADMINISTRATOR_BLOCK = salesBlock(
  BLOCK_KEYS.salesAdministrator,
  'Sales: Administrator',
  [BLOCK_KEYS.salesAll],
  'administrator',
  'all',
);
