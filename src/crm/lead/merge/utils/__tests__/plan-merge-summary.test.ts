import { describe, expect, it } from 'vitest';

import { leadRow } from 'src/crm/lead/merge/utils/__tests__/fixtures/lead-row.fixture';
import { planMergeSummary } from 'src/crm/lead/merge/utils/plan-merge-summary.util';

const label = (message: string, values: Record<string, string | number> = {}) =>
  message.replace(/\{(\w+)\}/g, (whole, name: string) => (name in values ? String(values[name]) : whole));

const NAMES = {
  stages: { 'stage-new': 'New' },
  teams: { 'team-1': 'Sales' },
  members: { 'user-1': 'Ann Lee' },
  plans: { 'plan-monthly': 'Monthly' },
  lostReasons: { 'reason-1': 'Too expensive' },
  campaigns: {},
  mediums: { 'medium-email': 'Email' },
  sources: {},
};

describe('planMergeSummary', () => {
  it('lists what each merged-away lead held, line by line', () => {
    const tail = leadRow({
      id: 'tail-1',
      createdAt: '2026-02-01T09:30:00.000Z',
      name: 'Gym B',
      leadType: 'OPPORTUNITY',
      stageId: 'stage-new',
      probability: 40,
      priority: 'HIGH',
      expectedRevenue: { amountMicros: 1_000_000_000, currencyCode: 'USD' },
      recurringRevenue: { amountMicros: 50_000_000, currencyCode: 'USD' },
      recurringPlanId: 'plan-monthly',
      salespersonId: 'user-1',
      teamId: 'team-1',
      contactName: 'Bob Day',
      emailFrom: { primaryEmail: 'bob@gymb.example', additionalEmails: null },
      contactAddress: {
        addressStreet1: '1 Main St',
        addressStreet2: null,
        addressCity: 'Columbus',
        addressPostcode: '43004',
        addressState: 'OH',
        addressCountry: null,
      },
      mediumId: 'medium-email',
      tags: ['HOT'],
    });

    expect(planMergeSummary({ tails: [tail], names: NAMES, label })).toBe(
      [
        'Merged the lead **Gym B** into this one.',
        '',
        '- Expected revenue: 1000.00 USD + 50.00 USD Monthly',
        '- Probability: 40 %',
        '- Type: Opportunity',
        '- Stage: New',
        '- Priority: High',
        '- Created on: 2026-02-01 09:30 UTC',
        '- Tags: HOT',
        '- Salesperson: Ann Lee',
        '- Sales team: Sales',
        '',
        '**Contact details**',
        '',
        '- Contact: Bob Day',
        '- Email: bob@gymb.example',
        '',
        '**Address**',
        '',
        '- 1 Main St',
        '- 43004',
        '- Columbus',
        '- OH',
        '',
        '**Marketing**',
        '',
        '- Medium: Email',
      ].join('\n'),
    );
  });

  it('shows no stage for a lead, no probability at 0, and no empty block', () => {
    const tail = leadRow({ id: 'tail-2', createdAt: '2026-02-02T00:00:00.000Z', name: 'Walk-in', stageId: 'stage-new' });

    expect(planMergeSummary({ tails: [tail], names: NAMES, label })).toBe(
      ['Merged the lead **Walk-in** into this one.', '', '- Type: Lead', '- Priority: Low', '- Created on: 2026-02-02 00:00 UTC'].join('\n'),
    );
  });

  it('shows a recurring revenue alone when there is no expected revenue', () => {
    const tail = leadRow({
      id: 'tail-3',
      createdAt: '2026-02-03T00:00:00.000Z',
      name: 'Club',
      recurringRevenue: { amountMicros: 20_000_000, currencyCode: 'EUR' },
      recurringPlanId: 'plan-monthly',
    });

    expect(planMergeSummary({ tails: [tail], names: NAMES, label })).toContain('- Recurring revenue: 20.00 EUR Monthly');
  });

  it('separates the blocks of several merged-away leads', () => {
    const first = leadRow({ id: 't1', createdAt: '2026-02-01T00:00:00.000Z', name: 'One' });
    const second = leadRow({ id: 't2', createdAt: '2026-02-01T00:00:00.000Z', name: 'Two' });
    const summary = planMergeSummary({ tails: [first, second], names: NAMES, label });

    expect(summary.split('\n\n---\n\n')).toHaveLength(2);
  });
});
