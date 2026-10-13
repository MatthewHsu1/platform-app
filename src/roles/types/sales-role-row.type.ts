import { type Rights } from 'src/roles/types/rights.type';

export type SalesRoleRow = { objectUniversalIdentifier: string; ownDocuments: Rights; allDocuments: Rights; administrator: Rights };
