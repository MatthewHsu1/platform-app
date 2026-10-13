import { describe, expect, it } from 'vitest';

import { type OrderRequestRow } from 'src/stock/orderpoint/types/order-request-row.type';
import { planOrderRequest } from 'src/stock/orderpoint/utils/plan-order-request.util';
import { resolveUoms } from 'src/uom/utils/uom.util';

const { resolved } = resolveUoms([
  { id: 'Units', name: 'Units', relativeUomId: null, relativeFactor: 1, seedKey: null },
  { id: 'Dozens', name: 'Dozens', relativeUomId: 'Units', relativeFactor: 12, seedKey: null },
]);
const units = resolved.get('Units')!;

const row = (values: Partial<OrderRequestRow>): OrderRequestRow => ({
  id: 'op1',
  trigger: 'AUTO',
  qtyToOrder: 0,
  qtyForecast: 10,
  productMaxQty: 200,
  productUom: units,
  replenishmentUom: null,
  ...values,
});

describe('planOrderRequest', () => {
  it('Order with no quantity to order on the selected rule orders nothing and says so', () => {
    expect(planOrderRequest({ mode: 'ORDER', rows: [row({})], digits: 2 })).toEqual({
      kind: 'order',
      quantities: new Map(),
      setAutoIds: [],
      nothingToOrder: true,
    });
  });

  it('orders when at least one selected rule has something to order', () => {
    expect(planOrderRequest({ mode: 'ORDER', rows: [row({}), row({ id: 'op2', qtyToOrder: 4 })], digits: 2 })).toEqual({
      kind: 'order',
      quantities: new Map(),
      setAutoIds: [],
      nothingToOrder: false,
    });
  });

  it('Order To Max orders the maximum less the forecast: 200 - 10 = 190', () => {
    expect(planOrderRequest({ mode: 'ORDER_TO_MAX', rows: [row({})], digits: 2 })).toEqual({
      kind: 'order',
      quantities: new Map([['op1', 190]]),
      setAutoIds: [],
      nothingToOrder: false,
    });
  });

  it('Order To Max rounds up to whole multiples: 240 - 200 = 40 units is 4 dozens, 48 units', () => {
    const plan = planOrderRequest({
      mode: 'ORDER_TO_MAX',
      rows: [row({ qtyForecast: 200, productMaxQty: 240, replenishmentUom: resolved.get('Dozens')! })],
      digits: 2,
    });

    expect(plan.kind === 'order' && plan.quantities.get('op1')).toBe(48);
  });

  it('Order To Max with the forecast already at the maximum orders nothing and says so', () => {
    expect(planOrderRequest({ mode: 'ORDER_TO_MAX', rows: [row({ qtyForecast: 200 })], digits: 2 })).toMatchObject({
      kind: 'order',
      nothingToOrder: true,
    });
  });

  it('Automate refuses an automatic rule or a rule with nothing to order', () => {
    expect(planOrderRequest({ mode: 'AUTOMATE', rows: [row({ trigger: 'AUTO', qtyToOrder: 5 })], digits: 2 })).toEqual({
      kind: 'refuse',
      message: 'automateRefused',
    });
    expect(planOrderRequest({ mode: 'AUTOMATE', rows: [row({ trigger: 'MANUAL', qtyToOrder: 0 })], digits: 2 })).toEqual({
      kind: 'refuse',
      message: 'automateRefused',
    });
  });

  it('Automate turns manual rules with something to order automatic, then orders them', () => {
    expect(planOrderRequest({ mode: 'AUTOMATE', rows: [row({ trigger: 'MANUAL', qtyToOrder: 5 })], digits: 2 })).toEqual({
      kind: 'order',
      quantities: new Map(),
      setAutoIds: ['op1'],
      nothingToOrder: false,
    });
  });
});
