import { EMAIL_STATE, LEAD_TYPE, PHONE_STATE, PRIORITY } from 'src/crm/crm-options.constant';
import { type FilterCatalogueEntry } from 'src/shared/filter-editor/types/filter-catalogue-entry.type';
import { type FilterOperator } from 'src/shared/filter-editor/types/filter-operator.type';

const TEXT: FilterOperator[] = ['=', '!=', 'contains', 'doesNotContain', 'beginsWith', 'endsWith', 'in', 'notIn', 'null', 'notNull'];
const NUMBER: FilterOperator[] = ['=', '!=', '<', '<=', '>', '>=', 'between', 'null', 'notNull'];
const CHOICE: FilterOperator[] = ['=', '!=', 'in', 'notIn', 'null', 'notNull'];
const TAGS: FilterOperator[] = ['containsAny', 'null', 'notNull'];

const text = (name: string, label: string): FilterCatalogueEntry => ({ name, label, kind: 'text', operators: TEXT });
const select = (name: string, label: string, options?: readonly string[]): FilterCatalogueEntry => ({
  name,
  label,
  kind: 'select',
  operators: CHOICE,
  ...(options === undefined ? {} : { options }),
});
const relation = (
  name: string,
  label: string,
  objectSingular: string,
  objectPlural: string,
  labelField: string,
  labelKind: 'text' | 'fullName' = 'text',
): FilterCatalogueEntry => ({
  name,
  label,
  kind: 'relation',
  operators: CHOICE,
  relation: { objectSingular, objectPlural, labelField, labelKind },
});
const hop = (
  relationField: string,
  objectSingular: string,
  objectPlural: string,
  field: string,
  label: string,
  kind: 'text' | 'number' = 'text',
): FilterCatalogueEntry => ({
  name: `${relationField}.${field}`,
  label,
  kind,
  operators: kind === 'number' ? NUMBER : TEXT,
  hop: { relationField, objectSingular, objectPlural, field, kind },
});

// The lead fields an assignment filter may read. Labels are the English
// source; the editor translates them.
export const LEAD_FILTER_CATALOGUE: FilterCatalogueEntry[] = [
  text('name', 'Name'),
  text('contactName', 'Contact name'),
  text('partnerName', 'Company name'),
  text('referred', 'Referred by'),
  text('emailFrom.primaryEmail', 'Email'),
  text('phone.primaryPhoneNumber', 'Phone'),
  text('contactAddress.addressCity', 'City'),
  text('contactAddress.addressState', 'State'),
  text('contactAddress.addressPostcode', 'Postcode'),
  text('contactAddress.addressCountry', 'Country'),
  { name: 'probability', label: 'Probability (%)', kind: 'number', operators: NUMBER },
  { name: 'expectedRevenue', label: 'Expected revenue', kind: 'currency', operators: NUMBER },
  { name: 'createdAt', label: 'Created', kind: 'date', operators: NUMBER },
  { name: 'dateDeadline', label: 'Expected closing', kind: 'date', operators: NUMBER },
  select('leadType', 'Type', Object.values(LEAD_TYPE)),
  select('priority', 'Priority', Object.values(PRIORITY)),
  select('phoneState', 'Phone quality', Object.values(PHONE_STATE)),
  select('emailState', 'Email quality', Object.values(EMAIL_STATE)),
  select('language', 'Language'),
  { name: 'tags', label: 'Tags', kind: 'multiSelect', operators: TAGS },
  relation('stage', 'Stage', 'crmStage', 'crmStages', 'name'),
  relation('source', 'Source', 'utmSource', 'utmSources', 'name'),
  relation('medium', 'Medium', 'utmMedium', 'utmMediums', 'name'),
  relation('campaign', 'Campaign', 'utmCampaign', 'utmCampaigns', 'name'),
  relation('person', 'Contact', 'person', 'people', 'name', 'fullName'),
  relation('company', 'Customer', 'company', 'companies', 'name'),
  relation('salesperson', 'Salesperson', 'workspaceMember', 'workspaceMembers', 'name', 'fullName'),
  hop('company', 'company', 'companies', 'name', 'Customer: name'),
  hop('company', 'company', 'companies', 'address.addressCity', 'Customer: city'),
  hop('company', 'company', 'companies', 'address.addressCountry', 'Customer: country'),
  hop('person', 'person', 'people', 'jobTitle', 'Contact: job title'),
  hop('person', 'person', 'people', 'postalAddress.addressCity', 'Contact: city'),
  hop('source', 'utmSource', 'utmSources', 'name', 'Source: name'),
  hop('medium', 'utmMedium', 'utmMediums', 'name', 'Medium: name'),
  hop('campaign', 'utmCampaign', 'utmCampaigns', 'name', 'Campaign: name'),
  hop('stage', 'crmStage', 'crmStages', 'name', 'Stage: name'),
  hop('stage', 'crmStage', 'crmStages', 'sequence', 'Stage: sequence', 'number'),
];
