import { CRM_LEAD_FIELD_UNIVERSAL_IDENTIFIERS, CRM_LEAD_OBJECT_UNIVERSAL_IDENTIFIER } from 'src/crm/crm-universal-identifiers.constant';
import { HELPDESK_TICKET_FIELD_UNIVERSAL_IDENTIFIERS, HELPDESK_TICKET_OBJECT_UNIVERSAL_IDENTIFIER } from 'src/helpdesk/helpdesk-universal-identifiers.constant';
import { BLOCK_KEYS } from 'src/roles/blocks/block-keys.constant';
import { type RoleModule } from 'src/roles/types/role-module.type';

const NONE = { key: 'none', label: 'None', blockKey: null };

// The drop-downs of the Roles page, in the order a mixed role's label names their blocks. Employee
// is not here: every staff member holds it.
export const ROLE_MODULES: RoleModule[] = [
  {
    key: 'inventory',
    label: 'Inventory',
    levels: [
      NONE,
      { key: 'user', label: 'User', blockKey: BLOCK_KEYS.inventoryUser },
      { key: 'administrator', label: 'Administrator', blockKey: BLOCK_KEYS.inventoryAdministrator },
    ],
    ownerFields: [],
  },
  {
    key: 'products',
    label: 'Products',
    levels: [NONE, { key: 'create', label: 'Create', blockKey: BLOCK_KEYS.productsCreate }],
    ownerFields: [],
  },
  {
    key: 'sales',
    label: 'Sales',
    levels: [
      NONE,
      { key: 'own', label: 'Own Documents', blockKey: BLOCK_KEYS.salesOwn },
      { key: 'all', label: 'All Documents', blockKey: BLOCK_KEYS.salesAll },
      { key: 'administrator', label: 'Administrator', blockKey: BLOCK_KEYS.salesAdministrator },
    ],
    ownerFields: [
      { objectUniversalIdentifier: CRM_LEAD_OBJECT_UNIVERSAL_IDENTIFIER, ownerFieldUniversalIdentifier: CRM_LEAD_FIELD_UNIVERSAL_IDENTIFIERS.salesperson },
    ],
  },
  {
    key: 'workCases',
    label: 'Work cases',
    levels: [
      NONE,
      { key: 'own', label: 'Own Documents', blockKey: BLOCK_KEYS.workCasesOwn },
      { key: 'all', label: 'All Documents', blockKey: BLOCK_KEYS.workCasesAll },
      { key: 'administrator', label: 'Administrator', blockKey: BLOCK_KEYS.workCasesAdministrator },
    ],
    ownerFields: [
      {
        objectUniversalIdentifier: HELPDESK_TICKET_OBJECT_UNIVERSAL_IDENTIFIER,
        ownerFieldUniversalIdentifier: HELPDESK_TICKET_FIELD_UNIVERSAL_IDENTIFIERS.assignedUser,
      },
    ],
  },
];
