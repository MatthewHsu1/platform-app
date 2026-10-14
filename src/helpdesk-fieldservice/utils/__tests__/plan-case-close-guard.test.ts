import { describe, expect, it } from 'vitest';

import { planCaseCloseGuard } from 'src/helpdesk-fieldservice/utils/plan-case-close-guard.util';

const REFUSED = { allow: false, reason: 'Please complete all service orders related to this work case to close it.' };

describe('planCaseCloseGuard', () => {
  it('lets a case without service orders close', () => {
    expect(planCaseCloseGuard({ stageClosed: true, orderClosedStatuses: [] })).toEqual({ allow: true });
  });

  it('lets a case close when every order is closed, completed or cancelled', () => {
    expect(planCaseCloseGuard({ stageClosed: true, orderClosedStatuses: ['COMPLETED', 'CANCELLED'] })).toEqual({ allow: true });
  });

  it('refuses closing a case when none of its orders is closed', () => {
    expect(planCaseCloseGuard({ stageClosed: true, orderClosedStatuses: ['OPEN', 'OPEN'] })).toEqual(REFUSED);
  });

  it('refuses closing a case when only some of its orders are closed', () => {
    expect(planCaseCloseGuard({ stageClosed: true, orderClosedStatuses: ['COMPLETED', 'OPEN'] })).toEqual(REFUSED);
  });

  it('reads an order without a closed status as open', () => {
    expect(planCaseCloseGuard({ stageClosed: true, orderClosedStatuses: ['COMPLETED', null] })).toEqual(REFUSED);
  });

  it('lets a case move to a stage that is not closed whatever its orders', () => {
    expect(planCaseCloseGuard({ stageClosed: false, orderClosedStatuses: ['OPEN'] })).toEqual({ allow: true });
  });
});
