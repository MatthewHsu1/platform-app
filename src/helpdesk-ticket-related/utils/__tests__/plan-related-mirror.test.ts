import { describe, expect, it } from 'vitest';

import { planRelatedMirror } from 'src/helpdesk-ticket-related/utils/plan-related-mirror.util';

const link = (id: string, ticketId: string, relatedTicketId: string) => ({ id, ticketId, relatedTicketId });

describe('planRelatedMirror', () => {
  it('links the other case back when a case is linked to it', () => {
    expect(planRelatedMirror({ created: [link('l1', 't1', 't2')], destroyed: [], existing: [link('l1', 't1', 't2')] })).toEqual({
      create: [{ ticketId: 't2', relatedTicketId: 't1' }],
      destroy: [],
    });
  });

  it('removes the link back when the link is removed', () => {
    expect(planRelatedMirror({ created: [], destroyed: [link('l1', 't1', 't2')], existing: [link('l2', 't2', 't1')] })).toEqual({
      create: [],
      destroy: ['l2'],
    });
  });

  it('adds nothing for a link back that already exists or for a link to the case itself', () => {
    expect(
      planRelatedMirror({
        created: [link('l1', 't1', 't2'), link('l3', 't3', 't3')],
        destroyed: [],
        existing: [link('l1', 't1', 't2'), link('l2', 't2', 't1'), link('l3', 't3', 't3')],
      }),
    ).toEqual({ create: [], destroy: [] });
  });

  it('makes one link back when the same pair is saved twice in a batch', () => {
    expect(
      planRelatedMirror({ created: [link('l1', 't1', 't2'), link('l1', 't1', 't2')], destroyed: [], existing: [link('l1', 't1', 't2')] }),
    ).toEqual({ create: [{ ticketId: 't2', relatedTicketId: 't1' }], destroy: [] });
  });
});
