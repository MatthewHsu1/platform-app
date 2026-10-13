import { describe, expect, it } from 'vitest';

import { routeLinksTouchingOrderpoints } from 'src/stock/orderpoint/utils/route-links-touching-orderpoints.util';

const FIELDS = ['productTemplateId', 'stockRouteId'];
const link = (productTemplateId: string, stockRouteId = 'route-1', deletedAt: string | null = null) => ({
  productTemplateId,
  stockRouteId,
  deletedAt,
});

describe('routeLinksTouchingOrderpoints', () => {
  it('takes a link made, deleted or brought back', () => {
    expect(routeLinksTouchingOrderpoints('created', [{ after: link('t1') }], FIELDS)).toEqual([link('t1')]);
    expect(routeLinksTouchingOrderpoints('restored', [{ after: link('t1') }], FIELDS)).toEqual([link('t1')]);
    expect(routeLinksTouchingOrderpoints('deleted', [{ before: link('t1') }], FIELDS)).toEqual([link('t1')]);
  });

  it('takes the old and the new record of a link pointed at another product or route', () => {
    expect(routeLinksTouchingOrderpoints('updated', [{ before: link('t1'), after: link('t2') }], FIELDS)).toEqual([
      link('t1'),
      link('t2'),
    ]);
    expect(
      routeLinksTouchingOrderpoints('updated', [{ before: link('t1', 'route-1'), after: link('t1', 'route-2') }], FIELDS),
    ).toEqual([link('t1', 'route-1'), link('t1', 'route-2')]);
  });

  it('skips an update that leaves both ends of the link as they were', () => {
    expect(
      routeLinksTouchingOrderpoints('updated', [{ before: { ...link('t1'), position: 1 }, after: { ...link('t1'), position: 2 } }], FIELDS),
    ).toEqual([]);
  });

  it('takes a link removed for good at once, but not one already deleted before', () => {
    expect(routeLinksTouchingOrderpoints('destroyed', [{ before: link('t1') }], FIELDS)).toEqual([link('t1')]);
    expect(
      routeLinksTouchingOrderpoints('destroyed', [{ before: link('t2', 'route-1', '2026-10-10T08:00:00.000Z') }], FIELDS),
    ).toEqual([]);
  });
});
