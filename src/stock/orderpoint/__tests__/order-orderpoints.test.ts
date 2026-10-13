import { describe, expect, it } from 'vitest';

import { CLAIM_HELD_MESSAGE } from 'src/shared/claims/claim';
import { ProcurementFailure } from 'src/stock/procurement/apply-procurement-plan';
import { StockUserError } from 'src/stock/stock-errors';
import { ORDERPOINT_MESSAGES } from 'src/stock/orderpoint/orderpoint-messages.constant';
import { makeOrderOrderpoints } from 'src/stock/orderpoint/order-orderpoints';
import { type OrderRow } from 'src/stock/orderpoint/types/order-row.type';
import { type ProcureResult } from 'src/stock/orderpoint/types/procure-result.type';
import { type SettledOrderRun } from 'src/stock/orderpoint/types/settled-order-run.type';
import { resolveUoms } from 'src/uom/utils/uom.util';

const { resolved } = resolveUoms([{ id: 'Units', name: 'Units', relativeUomId: null, relativeFactor: 1, seedKey: null }]);
const NO_RULE = { message: 'No rule has been found to replenish "{product}" in "{location}".', values: { product: 'Desk', location: 'WH/Stock' } };

const row = (values: Partial<OrderRow>): OrderRow => ({
  id: 'op1',
  name: 'OP/00001',
  trigger: 'AUTO',
  qtyToOrder: 0,
  qtyToOrderManual: 0,
  qtyForecast: 10,
  productMaxQty: 200,
  productUom: resolved.get('Units')!,
  replenishmentUom: null,
  warehouseId: 'WH',
  ...values,
});

const setup = ({
  rows,
  procureResult = { kind: 'done', moveIds: ['move-1'], failures: [], unprocessedIds: [] },
  busy = [],
  written = false,
  raceRefusal = false,
  finishFails = false,
  procureThrows = false,
  releaseFails = false,
  settled = written ? { kind: 'pending', notReachedIds: [] } : { kind: 'nothingWritten' },
}: {
  rows: OrderRow[];
  procureResult?: ProcureResult;
  busy?: string[];
  written?: boolean;
  raceRefusal?: boolean;
  finishFails?: boolean;
  procureThrows?: boolean;
  releaseFails?: boolean;
  settled?: SettledOrderRun;
}) => {
  const steps: string[] = [];
  const quantities: [string, number][] = [];
  const list = (ids: string[]) => (ids.length === 0 ? '-' : ids.join(','));
  const order = makeOrderOrderpoints({
    newRunId: () => 'run-1',
    takeClaims: async (ids) => ({ taken: ids.filter((id) => !busy.includes(id)), busy }),
    releaseClaims: async (ids, runId) => {
      if (releaseFails) {
        throw new Error('server busy');
      }
      steps.push(`release ${ids.join(',')} ${runId}`);
    },
    settleAfterError: async (ids, runId) => {
      steps.push(`release unless written ${ids.join(',')} ${runId}`);
      return settled;
    },
    markChunk: async (_runId, ids, procurementRunId) => {
      steps.push(`mark ${ids.join(',')} under ${procurementRunId}`);
    },
    recompute: async (ids) => {
      steps.push(`recompute ${ids.join(',')}`);
      return { failures: [] };
    },
    readRows: async (ids) => rows.filter((candidate) => ids.includes(candidate.id)),
    procure: async (_ids, options) => {
      quantities.push(...options.quantities);
      if (procureResult.kind === 'done' || raceRefusal) {
        await options.beforeWrite();
      }
      if (procureResult.kind === 'done') {
        await options.onChunkCommit(_ids, 'procurement-run-1');
        if (procureThrows) {
          throw new Error('server stopped');
        }
        steps.push('procure');
      }
      return procureResult;
    },
    setAutomatic: async (ids) => {
      steps.push(`automatic ${ids.join(',')}`);
    },
    startFinish: async (runId, plan) => {
      steps.push(`start finish ${runId} clear ${list(plan.clearTypedIds)} automatic ${list(plan.automaticIds)}`);
    },
    completeFinish: async (_runId, plan, revertIds) => {
      if (finishFails) {
        throw new Error('server busy');
      }
      steps.push(`finish clear ${list(plan.clearTypedIds)} back to manual ${list(revertIds)}`);
    },
    finishWithoutOrder: async (plan) => {
      steps.push(`finish without order clear ${list(plan.clearTypedIds)}`);
    },
    readFirstMove: async () => ({ locationWarehouseId: 'WH2', locationUsage: 'INTERNAL', pickingName: 'WH2/OUT/00001' }),
    digits: () => 2,
  });

  return { order, steps, quantities };
};

describe('orderOrderpoints', () => {
  it('Order To Max on 10 in stock and a maximum of 200 orders 190, then clears the typed quantity', async () => {
    const { order, steps, quantities } = setup({ rows: [row({ qtyToOrderManual: 4, warehouseId: 'WH' })] });

    const outcome = await order(['op1'], 'ORDER_TO_MAX');

    expect(quantities).toEqual([['op1', 190]]);
    expect(steps).toEqual([
      'recompute op1',
      'start finish run-1 clear op1 automatic -',
      'mark op1 under procurement-run-1',
      'procure',
      'finish clear op1 back to manual -',
      'release op1 run-1',
    ]);
    expect(outcome).toEqual({ message: { message: ORDERPOINT_MESSAGES.interWarehouse }, pickingName: 'WH2/OUT/00001', details: [] });
  });

  it('Order with nothing to order orders nothing, still clears the typed quantity, and says so', async () => {
    const { order, steps } = setup({ rows: [row({ qtyToOrderManual: -3 })] });

    const outcome = await order(['op1'], 'ORDER');

    expect(steps).toEqual(['recompute op1', 'finish without order clear op1', 'release op1 run-1']);
    expect(outcome).toEqual({ message: { message: ORDERPOINT_MESSAGES.nothingToOrder }, pickingName: null, details: [] });
  });

  it('Automate makes the rule automatic only after every check passed, then orders it', async () => {
    const { order, steps } = setup({ rows: [row({ trigger: 'MANUAL', qtyToOrder: 5 })] });

    await order(['op1'], 'AUTOMATE');

    expect(steps.slice(0, 5)).toEqual([
      'recompute op1',
      'start finish run-1 clear - automatic op1',
      'automatic op1',
      'mark op1 under procurement-run-1',
      'procure',
    ]);
  });

  it('a refused Automate leaves the rule manual, orders nothing and frees the rule', async () => {
    const { order, steps } = setup({ rows: [row({ trigger: 'MANUAL', qtyToOrder: 5 })], procureResult: { kind: 'refused', errors: [NO_RULE] } });

    await expect(order(['op1'], 'AUTOMATE')).rejects.toEqual(new ProcurementFailure([NO_RULE]));
    expect(steps).toEqual(['recompute op1', 'release unless written op1 run-1']);
  });

  it('an Automate refused after its checks passed (the routing changed meanwhile) hands the rule back for the trigger to be put back', async () => {
    const { order, steps } = setup({
      rows: [row({ trigger: 'MANUAL', qtyToOrder: 5 })],
      procureResult: { kind: 'refused', errors: [NO_RULE] },
      raceRefusal: true,
    });

    await expect(order(['op1'], 'AUTOMATE')).rejects.toEqual(new ProcurementFailure([NO_RULE]));
    expect(steps).toEqual(['recompute op1', 'start finish run-1 clear - automatic op1', 'automatic op1', 'release unless written op1 run-1']);
  });

  it('refuses Automate on an automatic rule, and frees the rule', async () => {
    const { order, steps } = setup({ rows: [row({ qtyToOrder: 5 })] });

    await expect(order(['op1'], 'AUTOMATE')).rejects.toEqual(new StockUserError(ORDERPOINT_MESSAGES.automateRefused));
    expect(steps).toEqual(['recompute op1', 'release unless written op1 run-1']);
  });

  it('refuses while another click is ordering one of the rules, and frees the ones it took', async () => {
    const { order, steps } = setup({ rows: [row({ qtyToOrder: 5 }), row({ id: 'op2', qtyToOrder: 5 })], busy: ['op2'] });

    await expect(order(['op1', 'op2'], 'ORDER')).rejects.toEqual(new StockUserError(CLAIM_HELD_MESSAGE));
    expect(steps).toEqual(['release op1 run-1']);
  });

  it('answers the order placed and keeps the rules claimed when the steps after it fail', async () => {
    const { order, steps } = setup({ rows: [row({ qtyToOrder: 5, qtyToOrderManual: 5 })], finishFails: true });

    const outcome = await order(['op1'], 'ORDER');

    expect(outcome).toEqual({
      message: { message: ORDERPOINT_MESSAGES.ordered },
      pickingName: null,
      details: [{ message: ORDERPOINT_MESSAGES.finishPending }],
    });
    expect(steps).toEqual(['recompute op1', 'start finish run-1 clear op1 automatic -', 'mark op1 under procurement-run-1', 'procure']);
  });

  it('an error after a chunk wrote finishes the order for its rules and answers which rules were not ordered', async () => {
    const { order } = setup({
      rows: [row({ qtyToOrder: 5 }), row({ id: 'op2', name: 'OP/00002', qtyToOrder: 5 })],
      procureThrows: true,
      settled: { kind: 'finished', writtenIds: ['op1'] },
    });

    expect(await order(['op1', 'op2'], 'ORDER')).toEqual({
      message: { message: ORDERPOINT_MESSAGES.ordered },
      pickingName: null,
      details: [{ message: ORDERPOINT_MESSAGES.notOrdered, values: { rules: 'OP/00002' } }],
    });
  });

  it('an error while a chunk is still writing answers the order pending and names the rules no chunk reached', async () => {
    const { order } = setup({
      rows: [row({ qtyToOrder: 5 }), row({ id: 'op2', name: 'OP/00002', qtyToOrder: 5 })],
      procureThrows: true,
      settled: { kind: 'pending', notReachedIds: ['op2'] },
    });

    expect(await order(['op1', 'op2'], 'ORDER')).toEqual({
      message: { message: ORDERPOINT_MESSAGES.ordered },
      pickingName: null,
      details: [{ message: ORDERPOINT_MESSAGES.notOrdered, values: { rules: 'OP/00002' } }, { message: ORDERPOINT_MESSAGES.finishPending }],
    });
  });

  it('an error after which the claims cannot be read only says the rules are brought up to date, not that they were ordered', async () => {
    const { order } = setup({ rows: [row({ qtyToOrder: 5 })], procureThrows: true, settled: { kind: 'unknown' } });

    expect(await order(['op1'], 'ORDER')).toEqual({
      message: { message: ORDERPOINT_MESSAGES.finishPending },
      pickingName: null,
      details: [],
    });
  });

  it('an error before anything was written reaches the user', async () => {
    const { order, steps } = setup({ rows: [row({ qtyToOrder: 5 })], procureThrows: true });

    await expect(order(['op1'], 'ORDER')).rejects.toThrow('server stopped');
    expect(steps[steps.length - 1]).toBe('release unless written op1 run-1');
  });

  it('answers the order when only freeing the rules afterwards fails', async () => {
    const { order } = setup({ rows: [row({ qtyToOrder: 5 })], releaseFails: true });

    expect(await order(['op1'], 'ORDER')).toEqual({ message: { message: ORDERPOINT_MESSAGES.interWarehouse }, pickingName: 'WH2/OUT/00001', details: [] });
  });

  it('lists the rules left unordered beside the success message; they keep their typed quantity and go back to manual', async () => {
    const { order, steps } = setup({
      rows: [
        row({ trigger: 'MANUAL', qtyToOrder: 5, qtyToOrderManual: 5 }),
        row({ id: 'op2', name: 'OP/00002', trigger: 'MANUAL', qtyToOrder: 5, qtyToOrderManual: 5 }),
        row({ id: 'op3', name: 'OP/00003', trigger: 'MANUAL', qtyToOrder: 5 }),
      ],
      procureResult: {
        kind: 'done',
        moveIds: ['move-1'],
        failures: [{ orderpointId: 'op2', productTemplateId: 'desk', productName: 'Desk', responsibleId: null, error: NO_RULE }],
        unprocessedIds: ['op3'],
      },
    });

    const outcome = await order(['op1', 'op2', 'op3'], 'AUTOMATE');

    expect(outcome).toEqual({
      message: { message: ORDERPOINT_MESSAGES.ordered },
      pickingName: null,
      details: [NO_RULE, { message: ORDERPOINT_MESSAGES.notOrdered, values: { rules: 'OP/00003' } }],
    });
    expect(steps.filter((step) => step.startsWith('finish'))).toEqual(['finish clear op1 back to manual op2,op3']);
  });
});
