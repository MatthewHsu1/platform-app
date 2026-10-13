import { useEffect, useState } from 'react';
import { defineFrontComponent } from 'twenty-sdk/define';
import { Trans, useRecordId, useTranslate } from 'twenty-sdk/front-component';
import { themeCssVariables } from 'twenty-ui/theme';

import { MEMBER_ASSIGNMENT_FILTERS_FRONT_COMPONENT_UNIVERSAL_IDENTIFIER } from 'src/crm/assignment/assignment-universal-identifiers.constant';
import { searchRecords } from 'src/crm/assignment/front/search-records';
import { LEAD_FILTER_LABELS, useAssignmentFilterTexts, useCheckFilter } from 'src/crm/assignment/front/team-assignment-filter.front-component';
import { useLeadFilterFields } from 'src/crm/assignment/front/use-lead-filter-fields';
import { FilterEditor } from 'src/shared/filter-editor/filter-editor';
import { filterText, parseStoredFilter } from 'src/shared/filter-editor/stored-filter';
import { queryAsUser } from 'src/shared/front-components/query-as-user';

type MemberFilters = { assignmentDomain: string | null; assignmentDomainPreferred: string | null };
type MemberFilterField = keyof MemberFilters;

// Reads and saves as the signed-in user; each filter must run as a lead search
// before it is saved.
const MemberAssignmentFilters = () => {
  const theme = themeCssVariables;
  const recordId = useRecordId();
  const texts = useAssignmentFilterTexts();
  const checkFilterAsUser = useCheckFilter();
  const { t } = useTranslate();
  const { fields, error: fieldsError } = useLeadFilterFields(LEAD_FILTER_LABELS);
  const [stored, setStored] = useState<MemberFilters | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (recordId === null) {
      return;
    }
    const load = async () => {
      try {
        const data = await queryAsUser<{ crmTeamMember: MemberFilters | null }>(
          'query MemberFilters($id: UUID!) { crmTeamMember(filter: { id: { eq: $id } }) { assignmentDomain assignmentDomainPreferred } }',
          { id: recordId },
        );
        setStored(data.crmTeamMember ?? { assignmentDomain: null, assignmentDomainPreferred: null });
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : String(caught));
      }
    };

    void load();
  }, [recordId]);

  if (recordId === null) {
    return <Trans>Open one team member first.</Trans>;
  }
  if (error !== null || fieldsError !== null) {
    return <div style={{ color: theme.color.red, padding: theme.spacing[3] }}>{error ?? fieldsError}</div>;
  }
  if (stored === null || fields === null) {
    return <Trans>Loading…</Trans>;
  }

  const save = (field: MemberFilterField) => async (query: unknown) => {
    await checkFilterAsUser(query);
    await queryAsUser(
      'mutation SaveMemberFilter($id: UUID!, $data: CrmTeamMemberUpdateInput!) { updateCrmTeamMember(id: $id, data: $data) { id } }',
      { id: recordId, data: { [field]: filterText(query) } },
    );
  };
  const heading = { padding: `${theme.spacing[3]} ${theme.spacing[3]} 0`, margin: 0 };
  const domain = parseStoredFilter(stored.assignmentDomain);
  const preferred = parseStoredFilter(stored.assignmentDomainPreferred);
  const unreadable = (filter: { unreadable: boolean }) =>
    filter.unreadable ? (
      <div style={{ color: theme.color.red, padding: `${theme.spacing[2]} ${theme.spacing[3]} 0` }}>
        {t('The saved filter could not be read. Saving replaces it.')}
      </div>
    ) : null;
  const help = { padding: `${theme.spacing[1]} ${theme.spacing[3]} 0` };

  return (
    <div className="platform-crm-member-filters">
      <h3 style={heading}>
        <Trans>Assignment filter</Trans>
      </h3>
      <div style={help}>
        <Trans>This salesperson receives only leads of the team that match this filter. Empty takes every lead.</Trans>
      </div>
      {unreadable(domain)}
      <FilterEditor
        fields={fields}
        value={domain.value}
        texts={texts}
        searchRecords={searchRecords}
        onSave={save('assignmentDomain')}
      />
      <h3 style={heading}>
        <Trans>Preferred filter</Trans>
      </h3>
      <div style={help}>
        <Trans>Leads that match this filter go to this salesperson first.</Trans>
      </div>
      {unreadable(preferred)}
      <FilterEditor
        fields={fields}
        value={preferred.value}
        texts={texts}
        searchRecords={searchRecords}
        onSave={save('assignmentDomainPreferred')}
      />
    </div>
  );
};

export default defineFrontComponent({
  universalIdentifier: MEMBER_ASSIGNMENT_FILTERS_FRONT_COMPONENT_UNIVERSAL_IDENTIFIER,
  name: 'crm-team-member-assignment-filters',
  description: 'Edits which leads of the team a salesperson receives, and which first.',
  component: MemberAssignmentFilters,
});
