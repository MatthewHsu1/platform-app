import { describe, expect, it } from 'vitest';

import { ticketCounts } from 'src/helpdesk-fieldservice/utils/ticket-counts.util';

describe('ticketCounts', () => {
  const cases = [
    { fsmLocationId: 'test', active: true },
    { fsmLocationId: 'test', active: true },
    { fsmLocationId: 'other', active: true },
  ];

  it('counts the cases at each location', () => {
    expect(ticketCounts(['test', 'other'], cases)).toEqual([
      { id: 'test', ticketCount: 2 },
      { id: 'other', ticketCount: 1 },
    ]);
  });

  it('counts one case less once its location is cleared', () => {
    expect(ticketCounts(['test'], [cases[0], { fsmLocationId: null, active: true }])).toEqual([{ id: 'test', ticketCount: 1 }]);
  });

  it('does not count an archived case', () => {
    expect(ticketCounts(['test'], [...cases, { fsmLocationId: 'test', active: false }])).toEqual([{ id: 'test', ticketCount: 2 }]);
  });

  it('gives a location without cases a count of zero', () => {
    expect(ticketCounts(['empty'], cases)).toEqual([{ id: 'empty', ticketCount: 0 }]);
  });
});
