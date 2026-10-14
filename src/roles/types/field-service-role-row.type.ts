import { type Rights } from 'src/roles/types/rights.type';

export type FieldServiceRoleRow = { objectUniversalIdentifier: string; userOwn: Rights; user: Rights; dispatcher: Rights; manager: Rights };
