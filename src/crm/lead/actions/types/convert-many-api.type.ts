import { type ConvertOptions } from 'src/crm/lead/actions/types/convert-options.type';
import { type LeadRow } from 'src/crm/lead/types/lead-row.type';

export type ConvertManyApi = {
  // In the order given: the leads still in play, and those in the trash.
  readLeads: (leadIds: string[]) => Promise<{ inPlay: LeadRow[]; trashed: LeadRow[] }>;
  findDuplicates: (lead: LeadRow) => Promise<LeadRow[]>;
  // The lead a merge of the group keeps, with the values the merge gives it.
  mergedHead: (group: LeadRow[]) => Promise<LeadRow | null>;
  // Refuses when the conversion would make any of these leads a customer the user may not create.
  requireCustomerRights: (leads: LeadRow[], options: ConvertOptions) => Promise<void>;
  mergeLeads: (leadIds: string[]) => Promise<{ headId: string }>;
  convertAndAllocate: (leads: LeadRow[], options: ConvertOptions) => Promise<void>;
};
