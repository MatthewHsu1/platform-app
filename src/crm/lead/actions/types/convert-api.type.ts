import { type CompanyInput } from 'src/crm/lead/actions/utils/types/company-input.type';
import { type PersonInput } from 'src/crm/lead/actions/utils/types/person-input.type';
import { type AddressValue } from 'src/crm/lead/types/address-value.type';
import { type PartnerPersonRow } from 'src/crm/lead/types/partner-person-row.type';
import { type StageRow } from 'src/crm/lead/types/stage-row.type';
import { type MembershipRow } from 'src/sales-team/team/types/membership-row.type';
import { type TeamRow } from 'src/sales-team/team/types/team-row.type';

type ConvertObject = 'crmLead' | 'person' | 'company';

export type ConvertApi = {
  // The objects whose records the clicking user may create and change.
  updatableObjects: () => Promise<ReadonlySet<ConvertObject>>;
  readStagesAndTeams: () => Promise<{ stages: StageRow[]; teams: TeamRow[]; memberships: MembershipRow[] }>;
  readPerson: (personId: string) => Promise<PartnerPersonRow | null>;
  findPersonByEmail: (email: string) => Promise<PartnerPersonRow | null>;
  findCompanyIdByExactName: (name: string) => Promise<string | null>;
  // The company, outside the trash, whose website is this domain as Twenty stores it.
  findCompanyIdByWebsite: (domain: string) => Promise<string | null>;
  readCompanyAddress: (companyId: string) => Promise<AddressValue | null>;
  recordExists: (objectSingular: 'person' | 'company', id: string) => Promise<boolean>;
  // 'taken' when another record holds a value that must be unique: a person's
  // email, a company's website.
  createCompany: (id: string, input: CompanyInput) => Promise<'created' | 'taken'>;
  createPerson: (id: string, input: PersonInput & { companyId: string | null }) => Promise<'created' | 'taken'>;
  addNote: (note: { id: string; objectSingular: ConvertObject; recordId: string; title: string; body: string }) => Promise<void>;
  updateLead: (leadId: string, data: Record<string, unknown>) => Promise<void>;
  readLocale: () => Promise<string>;
  now: () => string;
};
