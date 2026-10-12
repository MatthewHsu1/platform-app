import { type CustomerAction } from 'src/crm/lead/actions/utils/types/customer-action.type';

// `runId` names one opening of a dialog: a second click after a stopped run
// finds the contacts, companies and notes the first one made.
export type ConvertOptions = {
  customerAction: CustomerAction;
  personId: string | null;
  companyId: string | null;
  salespersonIds: string[];
  teamId: string | null;
  force: boolean;
  runId: string;
};
