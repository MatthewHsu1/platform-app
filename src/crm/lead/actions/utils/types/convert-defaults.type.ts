import { type CustomerAction } from 'src/crm/lead/actions/utils/types/customer-action.type';

export type ConvertDefaults = {
  customerAction: CustomerAction;
  personId: string | null;
  companyId: string | null;
  duplicateSearch: { email: string | null; personId: string | null; companyId: string | null };
  salespersonId: string | null;
  teamId: string | null;
};
