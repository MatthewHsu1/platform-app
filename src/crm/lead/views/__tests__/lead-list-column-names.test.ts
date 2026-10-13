import { describe, expect, it } from 'vitest';

import { leadListColumnNames } from 'src/crm/lead/views/lead-list-columns';

describe('leadListColumnNames', () => {
  it('is the nine lead columns while recurring revenues are off', () => {
    expect(leadListColumnNames(false)).toHaveLength(9);
    expect(leadListColumnNames(false)).not.toContain('recurringRevenueMonthly');
  });

  it('adds the monthly recurring amount as the tenth while they are on', () => {
    expect(leadListColumnNames(true)).toHaveLength(10);
    expect(leadListColumnNames(true)).toContain('recurringRevenueMonthly');
  });
});
