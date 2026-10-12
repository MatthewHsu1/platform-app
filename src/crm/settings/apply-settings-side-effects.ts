import { LEAD_VIEW_NAMES, RECURRING_FIELD_NAMES, RECURRING_FIELDS_SHOWN_BY_VIEW_TYPE } from 'src/crm/lead/crm-lead-views.constant';
import { readLeadObject } from 'src/crm/lead/read-lead-object';
import { setLeadTypeDefault } from 'src/crm/lead/set-lead-type-default';
import { CRM_SETTINGS_MESSAGES } from 'src/crm/settings/crm-settings-messages.constant';
import { translate } from 'src/shared/i18n/translate';
import { records } from 'src/shared/triggers/records';
import { requireData, twentyMetadata } from 'src/shared/twenty-graphql';

const TEAMS = records('crmTeam', 'crmTeams');
const LAST_POSITION = 100;

type LeadView = { id: string; name: string; key: string | null; type: string };
type ViewField = { id: string; fieldMetadataId: string; isVisible: boolean };

// Active teams that run a pipeline follow the leads switch.
const setTeamsUseLeads = async (useLeads: boolean) => {
  const teams = await TEAMS.find<{ id: string; useLeads: boolean | null }>(
    { active: { eq: true }, useOpportunities: { eq: true } },
    'id useLeads',
  );

  await TEAMS.updateMany(
    teams.filter((team) => team.useLeads !== useLeads).map((team) => team.id),
    { useLeads },
  );
};

export const setRecurringFieldsVisible = async (isOn: boolean) => {
  const object = await readLeadObject();
  const fieldIdOf = new Map(object.fieldsList.map((field) => [field.name, field.id]));
  const views = requireData(
    await twentyMetadata<{ getViews: LeadView[] }>(
      'application',
      'query LeadViews($objectMetadataId: String) { getViews(objectMetadataId: $objectMetadataId) { id name key type } }',
      { objectMetadataId: object.id },
    ),
    'Read the lead views',
  ).getViews.filter((view) => view.key === 'INDEX' || LEAD_VIEW_NAMES.includes(view.name));

  for (const view of views) {
    const shown = isOn ? (RECURRING_FIELDS_SHOWN_BY_VIEW_TYPE[view.type] ?? []) : [];
    const viewFields = requireData(
      await twentyMetadata<{ getViewFields: ViewField[] }>(
        'application',
        'query LeadViewFields($viewId: String!) { getViewFields(viewId: $viewId) { id fieldMetadataId isVisible } }',
        { viewId: view.id },
      ),
      'Read the fields of a lead view',
    ).getViewFields;

    for (const name of RECURRING_FIELD_NAMES) {
      const fieldMetadataId = fieldIdOf.get(name);
      const isVisible = shown.includes(name);
      const viewField = viewFields.find((candidate) => candidate.fieldMetadataId === fieldMetadataId);

      if (fieldMetadataId === undefined) {
        continue;
      }
      if (viewField !== undefined && viewField.isVisible !== isVisible) {
        requireData(
          await twentyMetadata('application', 'mutation ShowField($input: UpdateViewFieldInput!) { updateViewField(input: $input) { id } }', {
            input: { id: viewField.id, update: { isVisible } },
          }),
          'Show or hide a lead field',
        );
      } else if (viewField === undefined && isVisible) {
        requireData(
          await twentyMetadata('application', 'mutation AddField($input: CreateViewFieldInput!) { createViewField(input: $input) { id } }', {
            input: { viewId: view.id, fieldMetadataId, isVisible: true, position: LAST_POSITION },
          }),
          'Add a field to a lead view',
        );
      }
    }
  }
};

// What a changed switch implies. A part Twenty refuses is reported, not
// thrown: the settings are already saved. Each report names the part in the
// user's language, followed by Twenty's own text.
export const applySettingsSideEffects = async ({
  locale,
  useLeadsChanged,
  recurringChanged,
  useLeads,
  useRecurringRevenues,
}: {
  locale: string;
  useLeadsChanged: boolean;
  recurringChanged: boolean;
  useLeads: boolean;
  useRecurringRevenues: boolean;
}) => {
  const warnings: string[] = [];
  const attempt = async (what: string, work: () => Promise<void>) => {
    try {
      await work();
    } catch (error) {
      warnings.push(`${translate(locale, what)}: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  if (useLeadsChanged) {
    await attempt(CRM_SETTINGS_MESSAGES.leadTypeDefault, () => setLeadTypeDefault(useLeads));
    await attempt(CRM_SETTINGS_MESSAGES.salesTeams, () => setTeamsUseLeads(useLeads));
  }
  if (recurringChanged) {
    await attempt(CRM_SETTINGS_MESSAGES.recurringRevenueFields, () => setRecurringFieldsVisible(useRecurringRevenues));
  }

  return warnings;
};
