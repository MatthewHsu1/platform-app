import { describe, expect, it } from 'vitest';

import { closedStatusOf } from 'src/fieldservice/utils/closed-status-of.util';

describe('closedStatusOf', () => {
  it('closes an order in Completed or Cancelled and keeps every other stage open', () => {
    expect(closedStatusOf('COMPLETED')).toBe('COMPLETED');
    expect(closedStatusOf('CANCELLED')).toBe('CANCELLED');
    expect(closedStatusOf('NEW')).toBe('OPEN');
    expect(closedStatusOf('ON_SITE')).toBe('OPEN');
    expect(closedStatusOf(null)).toBe('OPEN');
  });
});
