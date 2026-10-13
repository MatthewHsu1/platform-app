import { describe, expect, it } from 'vitest';

import { planCaseCopy } from 'src/helpdesk/utils/plan-case-copy.util';
import { caseRow } from 'src/helpdesk/utils/__tests__/case-fixtures';

describe('planCaseCopy', () => {
  it('copies the fields of a case and leaves the number, stage, dates, original and derived copies to the save rules', () => {
    const original = caseRow({
      id: 'orig',
      number: 'HT00007',
      name: 'Belt slips',
      description: { markdown: 'At speed 8', blocknote: '[]' },
      assignedUserId: 'userOwn',
      stageId: 'done',
      personId: 'jill',
      companyId: 'acme',
      partnerName: 'Jill',
      partnerEmail: { primaryEmail: 'jill@example.com', additionalEmails: null },
      teamId: 'teamA',
      categoryId: 'cat',
      channel: 'PHONE',
      priority: 'HIGH',
      kanbanState: 'BLOCKED',
      duplicateId: 'other',
      lastStageUpdate: '2026-10-01T00:00:00.000Z',
      assignedDate: '2026-10-01T00:00:00.000Z',
      closedDate: '2026-10-02T00:00:00.000Z',
      unattended: false,
      active: true,
      ticketTypeId: 'type1',
      productId: 'prod1',
    });

    expect(planCaseCopy(original)).toEqual({
      number: '/',
      name: 'Belt slips',
      description: { markdown: 'At speed 8', blocknote: '[]' },
      assignedUserId: 'userOwn',
      personId: 'jill',
      partnerName: 'Jill',
      partnerEmail: { primaryEmail: 'jill@example.com', additionalEmails: null },
      teamId: 'teamA',
      categoryId: 'cat',
      channel: 'PHONE',
      priority: 'HIGH',
      kanbanState: 'BLOCKED',
      lastStageUpdate: '2026-10-01T00:00:00.000Z',
      active: true,
      ticketTypeId: 'type1',
      productId: 'prod1',
    });
  });

  it('copies an empty assignee as empty, so the copy is not given to whoever clicked', () => {
    expect(planCaseCopy(caseRow({ assignedUserId: null })).assignedUserId).toBeNull();
  });
});
