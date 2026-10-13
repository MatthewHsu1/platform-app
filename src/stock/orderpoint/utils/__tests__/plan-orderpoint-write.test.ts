import { describe, expect, it } from 'vitest';

import { type OrderpointValues } from 'src/stock/orderpoint/types/orderpoint-values.type';
import { type StoredOrderpointValues } from 'src/stock/orderpoint/types/stored-orderpoint-values.type';
import { planOrderpointWrite } from 'src/stock/orderpoint/utils/plan-orderpoint-write.util';

const next: OrderpointValues = {
  qtyOnHand: 14.5,
  qtyForecast: 14.5,
  qtyToOrderComputed: 20,
  qtyToOrder: 20,
  leadDays: 0,
  leadHorizonDate: '2026-09-02',
  deadlineDate: '2025-09-02',
  unwantedReplenish: false,
  showSupplyWarning: false,
  effectiveRouteId: 'reception',
};
const stored: StoredOrderpointValues = { ...next };

describe('planOrderpointWrite', () => {
  it('writes nothing when every value is the same (a second pass is quiet)', () => {
    expect(planOrderpointWrite(stored, next, 2)).toEqual({});
  });

  it('ignores differences below the unit precision', () => {
    expect(planOrderpointWrite({ ...stored, qtyForecast: 14.5000001 }, next, 2)).toEqual({});
  });

  it('writes only the values that changed', () => {
    expect(planOrderpointWrite({ ...stored, qtyToOrder: 16, deadlineDate: null }, next, 2)).toEqual({
      qtyToOrder: 20,
      deadlineDate: '2025-09-02',
    });
  });

  it('fills values never written', () => {
    const empty: StoredOrderpointValues = {
      qtyOnHand: null,
      qtyForecast: null,
      qtyToOrderComputed: null,
      qtyToOrder: null,
      leadDays: null,
      leadHorizonDate: null,
      deadlineDate: null,
      unwantedReplenish: null,
      showSupplyWarning: null,
      effectiveRouteId: null,
    };
    expect(planOrderpointWrite(empty, next, 2)).toEqual(next);
  });
});
