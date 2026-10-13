import { leadSelection, readLeadRow } from 'src/crm/lead/lead-selection';
import { type PartnerPersonRow } from 'src/crm/lead/types/partner-person-row.type';
import { type PartnerTriggerApi } from 'src/crm/lead/types/partner-trigger-api.type';
import { writeLeadsAsApplication } from 'src/crm/lead/write-leads-as-application';
import { stillDeletedIds } from 'src/shared/triggers/cascade-restore';
import { records } from 'src/shared/triggers/records';

const leads = records('crmLead', 'crmLeads');
const LEAD_SELECTION = leadSelection({ withTeam: true });
const partners = { person: records('person', 'people'), company: records('company', 'companies') };

const PERSON_SELECTION =
  'id name { firstName lastName } emails { primaryEmail additionalEmails } phones { primaryPhoneNumber primaryPhoneCountryCode primaryPhoneCallingCode additionalPhones } jobTitle companyId';

export const TWENTY_PARTNER_TRIGGER_API: PartnerTriggerApi = {
  readPeople: (ids) => partners.person.find<PartnerPersonRow>({ id: { in: ids } }, PERSON_SELECTION),
  readLeadsOf: async (field, ids) =>
    (await leads.find<Record<string, unknown>>({ [field]: { in: ids } }, LEAD_SELECTION)).map(readLeadRow),
  stillDeleted: (objectSingular, ids) => stillDeletedIds(partners[objectSingular], ids),
  writeLeads: writeLeadsAsApplication,
};
