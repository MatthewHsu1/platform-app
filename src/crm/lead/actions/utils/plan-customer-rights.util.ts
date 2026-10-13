import { planCreateCustomer } from 'src/crm/lead/actions/utils/plan-create-customer.util';
import { planCustomerTarget } from 'src/crm/lead/actions/utils/plan-customer-target.util';
import { type CustomerAction } from 'src/crm/lead/actions/utils/types/customer-action.type';
import { type LeadRow } from 'src/crm/lead/types/lead-row.type';

// The objects the user must be allowed to create for the lead's new
// customer. A company name counts as a company to create: whether a company
// of that name exists is not looked up, so the check can only ask for too
// much, never too little.
export const planCustomerRights = ({
  lead,
  action,
  chosenPersonId,
  chosenCompanyId,
  personByEmailId,
}: {
  lead: LeadRow;
  action: CustomerAction;
  chosenPersonId: string | null;
  chosenCompanyId: string | null;
  personByEmailId: string | null;
}): ('person' | 'company')[] => {
  if (planCustomerTarget({ lead, action, chosenPersonId, personByEmailId }).kind !== 'create') {
    return [];
  }

  const plan = planCreateCustomer({ lead, chosenCompanyId, companyIdByName: null, existingCompanyAddress: null, salespersonId: null });

  return [
    ...(plan.person === null ? [] : (['person'] as const)),
    ...(plan.company !== null && 'create' in plan.company ? (['company'] as const) : []),
  ];
};
