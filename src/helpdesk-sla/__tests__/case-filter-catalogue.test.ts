import { describe, expect, it } from 'vitest';

import { caseFilterRecord } from 'src/helpdesk-sla/case-filter-catalogue';
import { caseRow } from 'src/helpdesk/utils/__tests__/case-fixtures';

describe('caseFilterRecord', () => {
  it('exposes the case fields a policy filter can test, with the tag ids', () => {
    expect(
      caseFilterRecord(
        caseRow({ priority: 'HIGH', channel: 'PHONE', teamId: 't', categoryId: 'c', personId: 'p', ticketTypeId: 'ty', productId: 'pr', partnerName: 'Jill' }),
        ['tag1'],
      ),
    ).toEqual({
      name: 'New Ticket',
      priority: 'HIGH',
      channel: 'PHONE',
      kanbanState: 'NORMAL',
      partnerName: 'Jill',
      partnerEmail: null,
      teamId: 't',
      categoryId: 'c',
      personId: 'p',
      companyId: null,
      assignedUserId: null,
      ticketTypeId: 'ty',
      productId: 'pr',
      tagIds: ['tag1'],
    });
  });
});
