import { useEffect, useState } from 'react';
import { defineFrontComponent } from 'twenty-sdk/define';
import { msg, Trans, useRecordId, useTranslate } from 'twenty-sdk/front-component';
import { themeCssVariables } from 'twenty-ui/theme';

import { searchRecords } from 'src/crm/assignment/front/search-records';
import { CASE_FILTER_FIELDS } from 'src/helpdesk-sla/case-filter-catalogue';
import { HELPDESK_SLA_ACTION_UNIVERSAL_IDENTIFIERS } from 'src/helpdesk-sla/helpdesk-sla-universal-identifiers.constant';
import { FilterEditor } from 'src/shared/filter-editor/filter-editor';
import { filterText, parseStoredFilter } from 'src/shared/filter-editor/stored-filter';
import { type FilterEditorTexts } from 'src/shared/filter-editor/types/filter-editor-texts.type';
import { queryAsUser } from 'src/shared/front-components/query-as-user';

// The labels of the case fields a policy filter can test, and of its choices.
const FIELD_LABELS = {
  name: msg('Title'),
  priority: msg('Priority'),
  channel: msg('Channel'),
  kanbanState: msg('Kanban state'),
  partnerName: msg('Contact name'),
  partnerEmail: msg('Contact email'),
  teamId: msg('Team'),
  categoryId: msg('Category'),
  personId: msg('Contact'),
  companyId: msg('Customer company'),
  assignedUserId: msg('Assigned to'),
  ticketTypeId: msg('Type'),
  productId: msg('Product'),
  tagIds: msg('Tags'),
};

const OPTION_LABELS = {
  LOW: msg('Low'),
  MEDIUM: msg({ message: 'Medium', context: 'priority' }),
  HIGH: msg('High'),
  VERY_HIGH: msg('Very High'),
  NORMAL: msg('Default'),
  DONE: msg('Ready for next stage'),
  BLOCKED: msg('Blocked'),
};

const usePolicyFilterTexts = (): FilterEditorTexts => {
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
      in: t('is one of'),
      notIn: t('is none of'),
      containsAny: t('has any of'),
      null: t('is empty'),
      notNull: t('is set'),
    },
    translations: {
      addRule: { label: t('+ Condition'), title: t('Add condition') },
      addGroup: { label: t('+ Group'), title: t('Add group') },
      removeRule: { label: t('Remove'), title: t('Remove condition') },
      removeGroup: { label: t('Remove group'), title: t('Remove group') },
      notToggle: { label: t('Not'), title: t('Match the cases this group does not match') },
      fields: { title: t('Field') },
      operators: { title: t('Condition') },
      value: { title: t('Value') },
      values: { title: t('Values') },
      combinators: { title: t('Join conditions with') },
    },
  };
};

// Reads and saves as the signed-in user. The filter is kept as text and read by the service level engine when
// a case is checked against the policy.
const PolicyFilter = () => {
  const theme = themeCssVariables;
  const recordId = useRecordId();
  const texts = usePolicyFilterTexts();
  const { t } = useTranslate();
  const [stored, setStored] = useState<{ value: unknown; unreadable: boolean } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (recordId === null) {
      return;
    }
    const load = async () => {
      try {
        const data = await queryAsUser<{ helpdeskSla: { domain: string | null } | null }>(
          'query PolicyFilter($id: UUID!) { helpdeskSla(filter: { id: { eq: $id } }) { domain } }',
          { id: recordId },
        );

        setStored(parseStoredFilter(data.helpdeskSla?.domain ?? null));
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : String(caught));
      }
    };

    void load();
  }, [recordId]);

  if (recordId === null) {
    return <Trans>Open one SLA policy first.</Trans>;
  }
  if (error !== null) {
    return <div style={{ color: theme.color.red, padding: theme.spacing[3] }}>{error}</div>;
  }
  if (stored === null) {
    return <Trans>Loading…</Trans>;
  }
  const fields = CASE_FILTER_FIELDS.map((field) => ({
    ...field,
    label: t(FIELD_LABELS[field.name as keyof typeof FIELD_LABELS]),
    values: field.values?.map((option) => ({
      ...option,
      label: option.name in OPTION_LABELS ? t(OPTION_LABELS[option.name as keyof typeof OPTION_LABELS]) : option.label,
    })),
  }));

  return (
    <div className="platform-helpdesk-policy-filter">
      <div style={{ padding: `${theme.spacing[3]} ${theme.spacing[3]} 0` }}>
        <Trans>Only work cases that match this filter get this policy. An empty filter takes every case.</Trans>
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
          await queryAsUser('mutation SavePolicyFilter($id: UUID!, $data: HelpdeskSlaUpdateInput!) { updateHelpdeskSla(id: $id, data: $data) { id } }', {
            id: recordId,
            data: { domain: filterText(query) },
          });
        }}
      />
    </div>
  );
};

export default defineFrontComponent({
  universalIdentifier: HELPDESK_SLA_ACTION_UNIVERSAL_IDENTIFIERS.policyFilterFrontComponent,
  name: 'helpdesk-sla-policy-filter',
  description: 'Edits which work cases an SLA policy applies to.',
  component: PolicyFilter,
});
