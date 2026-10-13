import { describe, expect, it } from 'vitest';

import { type OrderpointToProcure } from 'src/stock/orderpoint/types/orderpoint-to-procure.type';
import {
  orderpointProcurementDate,
  planOrderpointProcurements,
} from 'src/stock/orderpoint/utils/plan-orderpoint-procurements.util';

const orderpoint = (values: Partial<OrderpointToProcure>): OrderpointToProcure => ({
  id: 'op1',
  name: 'OP/00001',
  productId: 'desk',
  productUomId: 'Units',
  locationId: 'WH-stock',
  warehouseId: 'WH',
  routeId: null,
  qtyToOrder: 17,
  // today 2025-09-02 + 9 days of rule delay + 365 days of horizon
  leadHorizonDate: '2026-09-11',
  ...values,
});

describe('orderpointProcurementDate', () => {
  it('is the lead horizon date at noon UTC minus the horizon: today + total delay', () => {
    expect(orderpointProcurementDate('2026-09-11', 365)).toBe('2025-09-11T12:00:00.000Z');
  });

  it('is the lead horizon date itself when there is no horizon', () => {
    expect(orderpointProcurementDate('2025-09-11', 0)).toBe('2025-09-11T12:00:00.000Z');
  });
});

describe('planOrderpointProcurements', () => {
  // Minimum 0, maximum 5, a delivery of 12 and a 9-day supply rule: one
  // receipt of 17, dated today once the rule delay is taken off.
  it('asks for the quantity to order at the rule location, dated today + delay', () => {
    expect(planOrderpointProcurements({ orderpoints: [orderpoint({})], horizonDays: 365, digits: 2, origins: new Map() })).toEqual([
      {
        orderpointId: 'op1',
        procurement: {
          productId: 'desk',
          productQty: 17,
          productUomId: 'Units',
          locationId: 'WH-stock',
          name: 'OP/00001',
          origin: 'OP/00001',
          values: {
            routeIds: [],
            datePlanned: '2025-09-11T12:00:00.000Z',
            dateDeadline: '2025-09-11T12:00:00.000Z',
            warehouseId: 'WH',
            orderpointId: 'op1',
            referenceIds: [],
          },
        },
      },
    ]);
  });

  it('passes the chosen route', () => {
    const [planned] = planOrderpointProcurements({
      orderpoints: [orderpoint({ routeId: 'resupply' })],
      horizonDays: 365,
      digits: 2,
      origins: new Map(),
    });

    expect(planned.procurement.values.routeIds).toEqual(['resupply']);
  });

  it('names the references of the move that set it off in the origin', () => {
    const [planned] = planOrderpointProcurements({
      orderpoints: [orderpoint({})],
      horizonDays: 365,
      digits: 2,
      origins: new Map([['op1', { referenceIds: ['ref1', 'ref2'], referenceNames: ['WH/OUT/00003', 'S00012'] }]]),
    });

    expect(planned.procurement.origin).toBe('OP/00001 - WH/OUT/00003,S00012');
    expect(planned.procurement.values.referenceIds).toEqual(['ref1', 'ref2']);
  });

  it('skips rules with nothing to order (at the unit precision)', () => {
    expect(
      planOrderpointProcurements({
        orderpoints: [orderpoint({ qtyToOrder: 0 }), orderpoint({ id: 'op2', qtyToOrder: 0.001 }), orderpoint({ id: 'op3', qtyToOrder: -4 })],
        horizonDays: 365,
        digits: 2,
        origins: new Map(),
      }),
    ).toEqual([]);
  });
});
