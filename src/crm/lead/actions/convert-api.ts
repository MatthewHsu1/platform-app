import { updateLeadAsUser } from 'src/crm/lead/actions/lead-action-route';
import { type ConvertApi } from 'src/crm/lead/actions/types/convert-api.type';
import { escapeLike } from 'src/shared/utils/escape-like.util';
import { CRM_LEAD_OBJECT_UNIVERSAL_IDENTIFIER } from 'src/crm/crm-universal-identifiers.constant';
import { loadLeadContext } from 'src/crm/lead/load-lead-context';
import { type AddressValue } from 'src/crm/lead/types/address-value.type';
import { type PartnerPersonRow } from 'src/crm/lead/types/partner-person-row.type';
import { STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS } from 'src/shared/standard-object-universal-identifiers.constant';
import { readUserLocale } from 'src/shared/i18n/read-user-locale';
import { filterUpdatableObjects } from 'src/shared/object-rights';
import { addNote } from 'src/shared/triggers/put-back';
import { records } from 'src/shared/triggers/records';
import { DUPLICATE_ENTRY_MESSAGE } from 'src/shared/triggers/retry-on-conflict';
import { requireData, twentyGraphql } from 'src/shared/twenty-graphql';

const PERSON_SELECTION =
  'id name { firstName lastName } emails { primaryEmail additionalEmails } phones { primaryPhoneNumber primaryPhoneCountryCode primaryPhoneCallingCode additionalPhones } jobTitle companyId';

const OBJECTS = {
  crmLead: CRM_LEAD_OBJECT_UNIVERSAL_IDENTIFIER,
  person: STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.person,
  company: STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.company,
} as const;

const RECORDS = { person: records('person', 'people'), company: records('company', 'companies') };

const firstPerson = async (filter: Record<string, unknown>) => {
  const found = requireData(
    await twentyGraphql<{ people: { edges: { node: PartnerPersonRow }[] } }>(
      'person',
      `query ConvertPerson($filter: PersonFilterInput) {
        people(filter: $filter, orderBy: [{ createdAt: AscNullsLast }], first: 1) { edges { node { ${PERSON_SELECTION} } } }
      }`,
      { filter },
    ),
    'Find a contact',
  );

  return found.people.edges[0]?.node ?? null;
};

// Made as the clicking user, with the id the run chose. A clash on a unique
// value answers 'taken'; the caller decides what to drop.
const create = async (objectName: 'Company' | 'Person', id: string, data: Record<string, unknown>) => {
  const created = await twentyGraphql<Record<string, { id: string } | null>>(
    'person',
    `mutation CreateForConvert($data: ${objectName}CreateInput!) { create${objectName}(data: $data) { id } }`,
    { data: { id, ...data } },
  );

  if ((created.errors ?? []).some((error) => error.message.includes(DUPLICATE_ENTRY_MESSAGE))) {
    return 'taken' as const;
  }
  requireData(created, `Create the ${objectName === 'Company' ? 'company' : 'contact'}`);

  return 'created' as const;
};

// Reads and new customers go as the clicking user, so their rights and row
// rules apply; notes go as the app. Whether a record this run made exists is
// read by the app, which sees it whoever owns it.
export const twentyConvertApi: ConvertApi = {
  updatableObjects: async () => {
    const allowed = await filterUpdatableObjects(Object.values(OBJECTS));

    return new Set((Object.keys(OBJECTS) as (keyof typeof OBJECTS)[]).filter((object) => allowed.has(OBJECTS[object])));
  },
  readStagesAndTeams: async () => {
    const { stages, teams, memberships } = await loadLeadContext([]);

    return { stages, teams, memberships };
  },
  readPerson: (personId) => firstPerson({ id: { eq: personId } }),
  findPersonByEmail: (email) => firstPerson({ emails: { primaryEmail: { ilike: escapeLike(email) } } }),
  findCompanyIdByExactName: async (name) => {
    const found = requireData(
      await twentyGraphql<{ companies: { edges: { node: { id: string } }[] } }>(
        'person',
        `query CompanyByName($name: String!) {
          companies(filter: { name: { eq: $name } }, orderBy: [{ createdAt: AscNullsLast }], first: 1) { edges { node { id } } }
        }`,
        { name },
      ),
      'Find a company by name',
    );

    return found.companies.edges[0]?.node.id ?? null;
  },
  findCompanyIdByWebsite: async (domain) => {
    const found = requireData(
      await twentyGraphql<{ companies: { edges: { node: { id: string } }[] } }>(
        'person',
        `query CompanyByWebsite($domain: String!) {
          companies(filter: { domainName: { primaryLinkUrl: { eq: $domain } } }, orderBy: [{ createdAt: AscNullsLast }], first: 1) { edges { node { id } } }
        }`,
        { domain },
      ),
      'Find a company by website',
    );

    return found.companies.edges[0]?.node.id ?? null;
  },
  readCompanyAddress: async (companyId) => {
    const found = requireData(
      await twentyGraphql<{ company: { address: AddressValue | null } | null }>(
        'person',
        `query ConvertCompanyAddress($id: UUID!) {
          company(filter: { id: { eq: $id } }) { address { addressStreet1 addressStreet2 addressCity addressPostcode addressState addressCountry } }
        }`,
        { id: companyId },
      ),
      'Read the company address',
    );

    return found.company?.address ?? null;
  },
  recordExists: async (objectSingular, id) =>
    (await RECORDS[objectSingular].findIncludingDeleted<{ id: string }>({ id: { eq: id } }, 'id')).length > 0,
  createCompany: (id, input) => create('Company', id, input),
  createPerson: (id, input) => create('Person', id, input),
  addNote: ({ id, objectSingular, recordId, title, body }) => addNote({ id, objectSingular, recordId, title, body }),
  updateLead: updateLeadAsUser,
  readLocale: readUserLocale,
  now: () => new Date().toISOString(),
};
