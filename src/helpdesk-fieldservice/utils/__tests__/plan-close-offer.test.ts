import { describe, expect, it } from 'vitest';

import { planCloseOffer } from 'src/helpdesk-fieldservice/utils/plan-close-offer.util';

const openCase = (orderClosedStatuses: (string | null)[]) => ({ stageClosed: false, orderClosedStatuses });

describe('planCloseOffer', () => {
  it('offers to close the case once its last order is completed, starting from the order resolution', () => {
    expect(
      planCloseOffer({ orderClosed: true, orderResolution: 'Just another resolution', workCase: openCase(['COMPLETED', 'COMPLETED', 'COMPLETED']) }),
    ).toEqual({ kind: 'offer', resolution: 'Just another resolution' });
  });

  it('offers nothing while another order of the case is open', () => {
    expect(planCloseOffer({ orderClosed: true, orderResolution: null, workCase: openCase(['COMPLETED', 'OPEN']) })).toEqual({
      kind: 'refuse',
      reason: 'Some service orders of the work case are still open.',
    });
  });

  it('offers nothing while this order itself is open', () => {
    expect(planCloseOffer({ orderClosed: false, orderResolution: null, workCase: openCase(['OPEN']) })).toMatchObject({ kind: 'refuse' });
  });

  it('offers nothing for an order without a work case', () => {
    expect(planCloseOffer({ orderClosed: true, orderResolution: null, workCase: null })).toEqual({
      kind: 'refuse',
      reason: 'This service order has no work case.',
    });
  });

  it('offers nothing for a case that is already closed', () => {
    expect(planCloseOffer({ orderClosed: true, orderResolution: null, workCase: { stageClosed: true, orderClosedStatuses: ['COMPLETED'] } })).toEqual({
      kind: 'refuse',
      reason: 'The work case is already closed.',
    });
  });
});
