import { type CompanyInput } from 'src/crm/lead/actions/utils/types/company-input.type';
import { type PersonInput } from 'src/crm/lead/actions/utils/types/person-input.type';

export type CustomerPlan = {
  company: { id: string } | { create: CompanyInput } | null;
  person: { create: PersonInput } | null;
};
