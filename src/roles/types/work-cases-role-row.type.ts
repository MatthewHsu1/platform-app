import { type Rights } from 'src/roles/types/rights.type';

export type WorkCasesRoleRow = { objectUniversalIdentifier: string; ownDocuments: Rights; allDocuments: Rights; administrator: Rights };
