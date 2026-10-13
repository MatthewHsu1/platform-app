import { type PhonesValue } from 'src/crm/lead/types/phones-value.type';

export type PersonPush = { personId: string; primaryEmail?: string; phone?: PhonesValue };
