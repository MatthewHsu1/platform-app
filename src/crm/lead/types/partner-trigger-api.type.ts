import { type AppLeadWrite } from 'src/crm/lead/types/app-lead-write.type';
import { type LeadRow } from 'src/crm/lead/types/lead-row.type';
import { type PartnerPersonRow } from 'src/crm/lead/types/partner-person-row.type';

export type PartnerTriggerApi = {
  readPeople: (ids: string[]) => Promise<PartnerPersonRow[]>;
  readLeadsOf: (field: 'personId' | 'companyId', ids: string[]) => Promise<LeadRow[]>;
  stillDeleted: (objectSingular: 'person' | 'company', ids: string[]) => Promise<string[]>;
  writeLeads: (writes: AppLeadWrite[]) => Promise<unknown>;
};
