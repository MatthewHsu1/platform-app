import { type CustomerAction } from 'src/crm/lead/actions/utils/types/customer-action.type';
import { type CustomerTarget } from 'src/crm/lead/actions/utils/types/customer-target.type';
import { type LeadRow } from 'src/crm/lead/types/lead-row.type';

// A chosen contact replaces the customer; a lead that has a customer keeps it;
// only then does "create" make one. Converting many, each lead takes the
// contact that holds its email, else gets a new one.
export const planCustomerTarget = ({
  lead,
  action,
  chosenPersonId,
  personByEmailId,
}: {
  lead: LeadRow;
  action: CustomerAction;
  chosenPersonId: string | null;
  personByEmailId: string | null;
}): CustomerTarget => {
  const hasCustomer = lead.personId !== null || lead.companyId !== null;

  if (action === 'EACH_EXIST_OR_CREATE') {
    if (hasCustomer) {
      return { kind: 'keep' };
    }

    return personByEmailId === null ? { kind: 'create' } : { kind: 'person', personId: personByEmailId };
  }

  if (chosenPersonId !== null) {
    return { kind: 'person', personId: chosenPersonId };
  }
  if (hasCustomer) {
    return { kind: 'keep' };
  }

  return action === 'CREATE' ? { kind: 'create' } : { kind: 'none' };
};
