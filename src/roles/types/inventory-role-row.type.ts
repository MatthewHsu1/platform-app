import { type Rights } from 'src/roles/types/rights.type';

export type InventoryRoleRow = {
  objectUniversalIdentifier: string;
  user: Rights;
  administrator: Rights;
  productsCreate: Rights;
};
