import { describe, expect, it } from 'vitest';

import { planOrderFromCase } from 'src/helpdesk-fieldservice/utils/plan-order-from-case.util';

const workCase = { id: 'case1', priority: 'MEDIUM', fsmLocationId: 'testLocation', description: 'Ticket test' };

describe('planOrderFromCase', () => {
  it('links the order to the case and takes its location and its description', () => {
    expect(planOrderFromCase(workCase)).toEqual({
      ticketId: 'case1',
      priority: 'LOW',
      locationId: 'testLocation',
      description: { markdown: 'Ticket test' },
    });
  });

  it('maps the four case priorities to the four order priorities by position', () => {
    const priorities = ['LOW', 'MEDIUM', 'HIGH', 'VERY_HIGH'].map((priority) => planOrderFromCase({ ...workCase, priority }).priority);

    expect(priorities).toEqual(['NORMAL', 'LOW', 'HIGH', 'URGENT']);
  });

  it('still makes an order for a case without a location, and leaves the location empty', () => {
    const plan = planOrderFromCase({ ...workCase, fsmLocationId: null });

    expect(plan).toEqual({ ticketId: 'case1', priority: 'LOW', description: { markdown: 'Ticket test' } });
  });

  it('writes the description as plain text, without its formatting', () => {
    expect(planOrderFromCase({ ...workCase, description: '**Printer** is _jammed_.\n' }).description).toEqual({ markdown: 'Printer is jammed.' });
  });

  it('leaves the description out when the case has none', () => {
    expect(planOrderFromCase({ ...workCase, description: null })).not.toHaveProperty('description');
    expect(planOrderFromCase({ ...workCase, description: '  ' })).not.toHaveProperty('description');
  });
});
