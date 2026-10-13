import { type CustomerAction } from 'src/crm/lead/actions/utils/types/customer-action.type';

// `runId` names one opening of the dialog, as for one lead.
export type ConvertManyInput = {
  leadIds: string[];
  deduplicate: boolean;
  customerAction: CustomerAction;
  personId: string | null;
  salespersonIds: string[];
  teamId: string | null;
  force: boolean;
  runId: string;
};
