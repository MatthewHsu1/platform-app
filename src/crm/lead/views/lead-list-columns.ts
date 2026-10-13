import { CRM_LEAD_FIELD_UNIVERSAL_IDENTIFIERS as F, CRM_LEAD_OBJECT_UNIVERSAL_IDENTIFIER } from 'src/crm/crm-universal-identifiers.constant';
import { SALES_TEAM_INVERSE_FIELD_UNIVERSAL_IDENTIFIERS } from 'src/sales-team/sales-team-universal-identifiers.constant';
import { allFields, listColumns, systemField } from 'src/stock/views/list-columns';

const LEAD_FIELDS = allFields(
  CRM_LEAD_OBJECT_UNIVERSAL_IDENTIFIER,
  [...Object.values(F), SALES_TEAM_INVERSE_FIELD_UNIVERSAL_IDENTIFIERS.crmLeadTeam],
  ['name'],
);

// The nine columns of a lead list; the tenth is the monthly recurring amount,
// which the CRM settings page shows while recurring revenues are on.
const LEAD_LIST_COLUMNS = [
  { name: 'name', id: systemField(CRM_LEAD_OBJECT_UNIVERSAL_IDENTIFIER, 'name') },
  { name: 'rottingDays', id: F.rottingDays },
  { name: 'stage', id: F.stage },
  { name: 'expectedRevenue', id: F.expectedRevenue },
  { name: 'probability', id: F.probability },
  { name: 'salesperson', id: F.salesperson },
  { name: 'team', id: SALES_TEAM_INVERSE_FIELD_UNIVERSAL_IDENTIFIERS.crmLeadTeam },
  { name: 'priority', id: F.priority },
  { name: 'createdAt', id: systemField(CRM_LEAD_OBJECT_UNIVERSAL_IDENTIFIER, 'createdAt') },
];

// The fields the lead "All" list keeps visible: the monthly recurring amount joins them while
// recurring revenues are on, so the one-time trim does not hide what the settings page showed.
export const leadListColumnNames = (useRecurringRevenues: boolean): string[] => [
  ...LEAD_LIST_COLUMNS.map((column) => column.name),
  ...(useRecurringRevenues ? ['recurringRevenueMonthly'] : []),
];

export const leadListColumns = (viewUniversalIdentifier: string) =>
  listColumns(
    viewUniversalIdentifier,
    LEAD_LIST_COLUMNS.map((column) => column.id),
    LEAD_FIELDS,
  );
