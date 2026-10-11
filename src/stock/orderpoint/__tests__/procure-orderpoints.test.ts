import { describe, expect, it } from 'vitest';

import { ProcurementFailure } from 'src/stock/procurement/apply-procurement-plan';
import { ORDERPOINT_MESSAGES } from 'src/stock/orderpoint/orderpoint-messages.constant';
import { makeProcureOrderpoints } from 'src/stock/orderpoint/procure-orderpoints';
import { type OrderpointFailure } from 'src/stock/orderpoint/types/orderpoint-failure.type';
import { type OrderpointProcureRow } from 'src/stock/orderpoint/types/orderpoint-procure-row.type';
import { type Procurement } from 'src/stock/utils/procurement/types/procurement.type';

const NO_RULE = { message: 'No rule has been found to replenish "{product}" in "{location}".', values: { product: 'Chair', location: 'WH/Stock' } };

const row = (values: Partial<OrderpointProcureRow>): OrderpointProcureRow => ({
  id: 'op-desk',
  name: 'OP/00001',
  productId: 'desk',
  productUomId: 'unit',
  locationId: 'stock',
  warehouseId: 'WH',
  routeId: null,
  qtyToOrder: 17,
  leadHorizonDate: '2026-09-11',
  productTemplateId: 'desk-template',
  productName: 'Desk',
  responsibleId: null,
  ...values,
});

// A chair has no supply rule: any batch holding it cannot be planned.
const setup = (rows: OrderpointProcureRow[], { failsTogetherOnly = false, checkPasses = false } = {}) => {
  const tried: string[][] = [];
  const ordered: Procurement[] = [];
  const tasks: OrderpointFailure[] = [];
  const fails = (procurement: Procurement) => procurement.productId === 'chair';
  const procure = makeProcureOrderpoints({
    readOrderpoints: async (ids) => rows.filter((candidate) => ids.includes(candidate.id)),
    readReferenceNames: async (ids) => new Map(ids.map((id) => [id, `name of ${id}`])),
    checkProcurements: async (procurements) => {
      if (!checkPasses && procurements.some(fails)) {
        throw new ProcurementFailure([NO_RULE]);
      }
    },
    tryProcurements: async (procurements) => {
      tried.push(procurements.map((procurement) => procurement.name));
      if (failsTogetherOnly && procurements.length > 1) {
        return { kind: 'failed', errors: [NO_RULE], failures: [] };
      }
      if (procurements.some(fails)) {
        return {
          kind: 'failed',
          errors: [NO_RULE],
          failures: procurements.flatMap((procurement, index) => (fails(procurement) ? [{ index, errors: [NO_RULE] }] : [])),
        };
      }
      ordered.push(...procurements);
      return { kind: 'done', moveIds: procurements.map((procurement) => `move of ${procurement.name}`) };
    },
    addIssueTasks: async (failures) => {
      tasks.push(...failures);
    },
    settings: () => ({ horizonDays: 365, digits: 2 }),
  });

  return { procure, tried, ordered, tasks };
};

const chair = row({ id: 'op-chair', name: 'OP/00002', productId: 'chair', productTemplateId: 'chair-template', productName: 'Chair', responsibleId: 'stock-manager' });

describe('procureOrderpoints', () => {
  it('the daily job drops the rule that fails, orders the rest and leaves a task on the failed product', async () => {
    const { procure, tried, ordered, tasks } = setup([row({}), chair]);

    const result = await procure(['op-desk', 'op-chair'], { raiseUserError: false, runId: 'run-1' });

    expect(tried).toEqual([['OP/00001', 'OP/00002'], ['OP/00001']]);
    expect(ordered.map((procurement) => [procurement.name, procurement.productQty])).toEqual([['OP/00001', 17]]);
    expect(result).toEqual({
      kind: 'done',
      moveIds: ['move of OP/00001'],
      failures: [
        { orderpointId: 'op-chair', productTemplateId: 'chair-template', productName: 'Chair', responsibleId: 'stock-manager', error: NO_RULE },
      ],
      unprocessedIds: [],
    });
    expect(tasks).toEqual(result.kind === 'done' ? result.failures : []);
  });

  it('a button refuses the whole order when any rule fails, and orders nothing', async () => {
    const { procure, tried, tasks } = setup([row({}), chair]);

    expect(await procure(['op-desk', 'op-chair'], { raiseUserError: true, runId: 'run-1' })).toEqual({ kind: 'refused', errors: [NO_RULE] });
    expect(tried).toEqual([]);
    expect(tasks).toEqual([]);
  });

  it('a button runs its own step once every chunk is checked, before anything is ordered, and never on a refusal', async () => {
    const steps: string[] = [];
    const { procure, tried } = setup([row({})]);

    await procure(['op-desk'], {
      raiseUserError: true,
      runId: 'run-1',
      beforeWrite: async () => {
        steps.push(`before write, ${tried.length} tried`);
      },
    });
    const refused = setup([row({}), chair]);
    const refusal = await refused.procure(['op-desk', 'op-chair'], {
      raiseUserError: true,
      runId: 'run-2',
      beforeWrite: async () => {
        steps.push('before a refused write');
      },
    });

    expect(steps).toEqual(['before write, 0 tried']);
    expect(tried).toEqual([['OP/00001']]);
    expect(refusal.kind).toBe('refused');
  });

  it('a button whose later chunk fails after an earlier chunk was ordered answers with both, as nothing is undone, and leaves out rules with nothing to order', async () => {
    const desks = Array.from({ length: 200 }, (_, index) => row({ id: `op-desk-${index}`, name: `OP/D${index}` }));
    const lamp = row({ id: 'op-lamp', name: 'OP/00003', productId: 'lamp' });
    const stocked = row({ id: 'op-stocked', name: 'OP/00004', productId: 'shelf', qtyToOrder: 0 });
    // The routing changed between the check and the second chunk's run.
    const { procure, tried, tasks } = setup([...desks, chair, lamp, stocked], { checkPasses: true });

    const result = await procure([...desks, chair, lamp, stocked].map((entry) => entry.id), { raiseUserError: true, runId: 'run-1' });

    expect(tried.map((names) => names.length)).toEqual([200, 2]);
    expect(result).toEqual({
      kind: 'done',
      moveIds: desks.map((desk) => `move of ${desk.name}`),
      failures: [
        { orderpointId: 'op-chair', productTemplateId: 'chair-template', productName: 'Chair', responsibleId: 'stock-manager', error: NO_RULE },
      ],
      unprocessedIds: ['op-lamp'],
    });
    expect(tasks).toEqual([]);
  });

  it('stops without ordering when the batch fails but no rule fails alone, and leaves a task on each product', async () => {
    const { procure, tried, ordered, tasks } = setup([row({}), row({ id: 'op-lamp', name: 'OP/00003', productId: 'lamp' })], { failsTogetherOnly: true });

    const result = await procure(['op-desk', 'op-lamp'], { raiseUserError: false, runId: 'run-1' });

    expect(tried).toEqual([['OP/00001', 'OP/00003']]);
    expect(ordered).toEqual([]);
    expect(result).toMatchObject({ kind: 'done', moveIds: [], failures: [], unprocessedIds: ['op-desk', 'op-lamp'] });
    expect(tasks.map((task) => [task.orderpointId, task.error])).toEqual([
      ['op-desk', { message: ORDERPOINT_MESSAGES.unprocessed, values: { rule: 'OP/00001' } }],
      ['op-lamp', { message: ORDERPOINT_MESSAGES.unprocessed, values: { rule: 'OP/00003' } }],
    ]);
  });

  it('orders the quantity the caller gives instead of the stored one, and names the references that set it off', async () => {
    const { procure, ordered } = setup([row({ qtyToOrder: 3 })]);

    await procure(['op-desk'], {
      raiseUserError: false,
      runId: 'run-1',
      quantities: new Map([['op-desk', 20]]),
      origins: new Map([['op-desk', ['ref-1']]]),
    });

    expect(ordered.map((procurement) => [procurement.productQty, procurement.origin, procurement.values.referenceIds])).toEqual([
      [20, 'OP/00001 - name of ref-1', ['ref-1']],
    ]);
  });
});
