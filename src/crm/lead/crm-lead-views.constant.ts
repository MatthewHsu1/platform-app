// The lead views Platform makes and keeps; "All" is Twenty's own list (key INDEX).
export const LEAD_VIEW_NAMES = ['Pipeline', 'My pipeline', 'Rotting', 'All'];

// The recurring revenue fields, shown only while recurring revenues are on.
export const RECURRING_FIELD_NAMES = [
  'recurringRevenue',
  'recurringPlan',
  'recurringRevenueMonthly',
  'recurringRevenueMonthlyProrated',
  'recurringRevenueProrated',
];

// Turning recurring revenues on shows the monthly amount as a list column and
// the amount and plan on the pipeline cards; the rest stay hidden columns.
export const RECURRING_FIELDS_SHOWN_BY_VIEW_TYPE: Record<string, string[]> = {
  TABLE: ['recurringRevenueMonthly'],
  KANBAN: ['recurringRevenue', 'recurringPlan'],
};

// A sales card: the name, the expected revenue, the contact and customer (or
// the names typed while neither is linked), priority, days rotting and the
// salesperson. Tags are staff-owned, and Twenty refuses a card field the app
// does not own.
export const PIPELINE_CARD_FIELDS = [
  'name',
  'expectedRevenue',
  'person',
  'company',
  'contactName',
  'partnerName',
  'priority',
  'rottingDays',
  'salesperson',
];
