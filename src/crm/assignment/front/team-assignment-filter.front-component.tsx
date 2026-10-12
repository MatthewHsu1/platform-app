import { useEffect, useState } from 'react';
import { defineFrontComponent } from 'twenty-sdk/define';
import { msg, Trans, useRecordId, useTranslate } from 'twenty-sdk/front-component';
import { themeCssVariables } from 'twenty-ui/theme';

import { TEAM_ASSIGNMENT_FILTER_FRONT_COMPONENT_UNIVERSAL_IDENTIFIER } from 'src/crm/assignment/assignment-universal-identifiers.constant';
import { checkFilter, filterText, parseStoredFilter } from 'src/crm/assignment/front/check-filter';
import { searchRecords } from 'src/crm/assignment/front/search-records';
import { useLeadFilterFields } from 'src/crm/assignment/front/use-lead-filter-fields';
import { type LeadFilterLabels } from 'src/crm/assignment/types/lead-filter-labels.type';
import { FilterEditor } from 'src/shared/filter-editor/filter-editor';
import { translateFilterError } from 'src/shared/filter-editor/translate-filter-error';
import { type FilterEditorTexts } from 'src/shared/filter-editor/types/filter-editor-texts.type';
import { queryAsUser } from 'src/shared/front-components/query-as-user';

// The labels of the lead filter fields, shared with the member page's editors.
export const LEAD_FILTER_LABELS: LeadFilterLabels = {
  fields: {
    name: msg('Name'),
    contactName: msg('Contact name'),
    partnerName: msg('Company name'),
    referred: msg('Referred by'),
    'emailFrom.primaryEmail': msg('Email'),
    'phone.primaryPhoneNumber': msg('Phone'),
    'contactAddress.addressCity': msg('City'),
    'contactAddress.addressState': msg('State'),
    'contactAddress.addressPostcode': msg('Postcode'),
    'contactAddress.addressCountry': msg('Country'),
    probability: msg('Probability (%)'),
    expectedRevenue: msg('Expected revenue'),
    createdAt: msg('Created'),
    dateDeadline: msg('Expected closing'),
    leadType: msg('Type'),
    priority: msg('Priority'),
    phoneState: msg('Phone quality'),
    emailState: msg('Email quality'),
    language: msg('Language'),
    tags: msg('Tags'),
    stage: msg('Stage'),
    source: msg('Source'),
    medium: msg('Medium'),
    campaign: msg('Campaign'),
    person: msg('Contact'),
    company: msg('Customer'),
    salesperson: msg('Salesperson'),
    'company.name': msg('Customer: name'),
    'company.address.addressCity': msg('Customer: city'),
    'company.address.addressCountry': msg('Customer: country'),
    'person.jobTitle': msg('Contact: job title'),
    'person.postalAddress.addressCity': msg('Contact: city'),
    'source.name': msg('Source: name'),
    'medium.name': msg('Medium: name'),
    'campaign.name': msg('Campaign: name'),
    'stage.name': msg('Stage: name'),
    'stage.sequence': msg('Stage: sequence'),
  },
  options: {
    LEAD: msg('Lead'),
    OPPORTUNITY: msg('Opportunity'),
    LOW: msg('Low'),
    MEDIUM: msg({ message: 'Medium', context: 'priority' }),
    HIGH: msg('High'),
    VERY_HIGH: msg('Very High'),
    CORRECT: msg('Correct'),
    INCORRECT: msg('Incorrect'),
  },
};

// Why a filter cannot be saved, listed for the extractor; each matches a text
// of src/shared/filter-editor/filter-error-messages.constant.ts.
export const FILTER_ERROR_TEXTS = [
  msg('The filter is not valid JSON.'),
  msg('The filter has no list of conditions.'),
  msg('Unknown field "{field}".'),
  msg('"{field}" cannot use "{operator}".'),
  msg('"{field}" needs a value.'),
  msg('"{field}" needs a number.'),
  msg('"{field}" needs two numbers.'),
  msg('"{field}" needs a date.'),
  msg('"{field}" needs two dates.'),
];

// Checks the filter as the clicking user, with a filter error in their language.
export const useCheckFilter = () => {
  const { t } = useTranslate();

  return (query: unknown) =>
    checkFilter(query).catch((error: unknown) => {
      throw new Error(translateFilterError(error, t));
    });
};

// The editor's texts, shared with the member page's editors.
export const useAssignmentFilterTexts = (): FilterEditorTexts => {
  const { t } = useTranslate();

  return {
    save: t('Save filter'),
    saving: t('Checking and saving…'),
    saved: t('Filter saved.'),
    and: t('and'),
    or: t('or'),
    search: t('Search'),
    clear: t('Clear'),
    searchError: t('The search failed. Try again.'),
    operators: {
      '=': t('is'),
      '!=': t('is not'),
      '<': t('less than'),
      '<=': t('at most'),
      '>': t('more than'),
      '>=': t('at least'),
      between: t('between'),
      in: t('is one of'),
      notIn: t('is none of'),
      contains: t('contains'),
      doesNotContain: t('does not contain'),
      beginsWith: t('starts with'),
      endsWith: t('ends with'),
      containsAny: t('has any of'),
      null: t('is empty'),
      notNull: t('is set'),
    },
    translations: {
      addRule: { label: t('+ Condition'), title: t('Add condition') },
      addGroup: { label: t('+ Group'), title: t('Add group') },
      removeRule: { label: t('Remove'), title: t('Remove condition') },
      removeGroup: { label: t('Remove group'), title: t('Remove group') },
      notToggle: { label: t('Not'), title: t('Match the leads this group does not match') },
      fields: { title: t('Field') },
      operators: { title: t('Condition') },
      value: { title: t('Value') },
      values: { title: t('Values') },
      combinators: { title: t('Join conditions with') },
    },
  };
};

// Reads and saves as the signed-in user; the filter must run as a lead search
// before it is saved.
const TeamAssignmentFilter = () => {
  const theme = themeCssVariables;
  const recordId = useRecordId();
  const texts = useAssignmentFilterTexts();
  const { fields, error: fieldsError } = useLeadFilterFields(LEAD_FILTER_LABELS);
  const checkFilterAsUser = useCheckFilter();
  const { t } = useTranslate();
  const [stored, setStored] = useState<{ value: unknown; unreadable: boolean } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (recordId === null) {
      return;
    }
    const load = async () => {
      try {
        const data = await queryAsUser<{ crmTeam: { assignmentDomain: string | null } | null }>(
          'query TeamFilter($id: UUID!) { crmTeam(filter: { id: { eq: $id } }) { assignmentDomain } }',
          { id: recordId },
        );
        setStored(parseStoredFilter(data.crmTeam?.assignmentDomain ?? null));
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : String(caught));
      }
    };

    void load();
  }, [recordId]);

  if (recordId === null) {
    return <Trans>Open one team first.</Trans>;
  }
  if (error !== null || fieldsError !== null) {
    return <div style={{ color: theme.color.red, padding: theme.spacing[3] }}>{error ?? fieldsError}</div>;
  }
  if (stored === null || fields === null) {
    return <Trans>Loading…</Trans>;
  }

  return (
    <div className="platform-crm-team-filter">
      <div style={{ padding: `${theme.spacing[3]} ${theme.spacing[3]} 0` }}>
        <Trans>Only unassigned leads that match this filter go to this team. An empty filter takes every lead.</Trans>
      </div>
      {stored.unreadable ? (
        <div style={{ color: theme.color.red, padding: `${theme.spacing[2]} ${theme.spacing[3]} 0` }}>
          {t('The saved filter could not be read. Saving replaces it.')}
        </div>
      ) : null}
      <FilterEditor
        fields={fields}
        value={stored.value}
        texts={texts}
        searchRecords={searchRecords}
        onSave={async (query) => {
          await checkFilterAsUser(query);
          await queryAsUser('mutation SaveTeamFilter($id: UUID!, $data: CrmTeamUpdateInput!) { updateCrmTeam(id: $id, data: $data) { id } }', {
            id: recordId,
            data: { assignmentDomain: filterText(query) },
          });
        }}
      />
    </div>
  );
};

export default defineFrontComponent({
  universalIdentifier: TEAM_ASSIGNMENT_FILTER_FRONT_COMPONENT_UNIVERSAL_IDENTIFIER,
  name: 'crm-team-assignment-filter',
  description: 'Edits which unassigned leads the team receives.',
  component: TeamAssignmentFilter,
});
