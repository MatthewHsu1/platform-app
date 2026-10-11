import { enqueueJobs } from 'twenty-sdk/logic-function';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { type makeFakeClaimStore } from 'src/shared/claims/__tests__/fakes/fake-claim-store';
import { destroyProcessedSuggestions } from 'src/stock/orderpoint/destroy-processed-suggestions';
import { readOrderpointRules } from 'src/stock/orderpoint/orderpoint-routing';
import { recomputeOrderpoint } from 'src/stock/orderpoint/recompute-orderpoint';
import { refreshReplenishmentSuggestions } from 'src/stock/orderpoint/refresh-replenishment-suggestions';

type Row = Record<string, unknown> & { id: string };

const fake = vi.hoisted(() => ({
  tables: new Map<string, Row[]>(),
  claimCountAtEnqueue: [] as number[],
  forecasts: new Map<string, number>(),
  claims: null as ReturnType<typeof makeFakeClaimStore> | null,
  // Runs once before the next create, as a person saving a rule meanwhile.
  beforeCreate: null as (() => void) | null,
}));

vi.mock('src/shared/claims/claim-store', async () => {
  const { makeFakeClaimStore: makeStore } = await import('src/shared/claims/__tests__/fakes/fake-claim-store');
  fake.claims = makeStore();
  return { graphqlClaimStore: fake.claims.store };
});

// The ids a filter names under `in`, wherever it sits, so a read returns the
// rows of the asked locations or products only.
const idsIn = (filter: unknown, field: string): string[] | null => {
  if (typeof filter !== 'object' || filter === null) {
    return null;
  }
  const record = filter as Record<string, unknown>;
  const condition = record[field] as { in?: string[]; eq?: string } | undefined;

  if (condition?.in !== undefined) {
    return condition.in;
  }
  if (condition?.eq !== undefined) {
    return [condition.eq];
  }
  for (const key of ['and', 'or']) {
    for (const part of (record[key] as unknown[] | undefined) ?? []) {
      const found = idsIn(part, field);
      if (found !== null) {
        return found;
      }
    }
  }
  return null;
};

const table = (name: string) => {
  if (!fake.tables.has(name)) {
    fake.tables.set(name, []);
  }
  return fake.tables.get(name) as Row[];
};

vi.mock('src/stock/stock-records', () => {
  const plain = (name: string) => ({ find: async () => structuredClone(table(name)) });

  return {
    stockLocations: plain('stockLocations'),
    stockWarehouses: plain('stockWarehouses'),
    stockQuants: {
      find: async (filter: unknown) => table('stockQuants').filter((row) => idsIn(filter, 'locationId')?.includes(row.locationId as string)),
    },
    stockMoves: {
      find: async (filter: { or: Record<string, { in: string[] }>[] }) =>
        table('stockMoves').filter((row) => filter.or.some((part) => Object.entries(part).some(([field, { in: ids }]) => ids.includes(row[field] as string)))),
    },
    productProducts: {
      find: async (filter: unknown) => table('productProducts').filter((row) => idsIn(filter, 'id')?.includes(row.id)),
    },
  };
});
vi.mock('src/stock/orderpoint/orderpoint-records', () => ({
  stockWarehouseOrderpoints: {
    findIncludingDeleted: async (filter: unknown) => {
      const productIds = idsIn(filter, 'productId');
      const ids = idsIn(filter, 'id');

      return table('orderpoints').filter(
        (row) => (productIds === null || productIds.includes(row.productId as string)) && (ids === null || ids.includes(row.id)),
      );
    },
    // The unique product and location key refuses the whole call.
    createMany: async (rows: Row[]) => {
      const hook = fake.beforeCreate;
      fake.beforeCreate = null;
      hook?.();
      const taken = new Set(table('orderpoints').map((row) => `${row.productId as string}|${row.locationId as string}`));
      if (rows.some((row) => taken.has(`${row.productId as string}|${row.locationId as string}`))) {
        throw new Error('duplicate key value violates unique constraint');
      }
      table('orderpoints').push(...structuredClone(rows));
      return rows.map((row) => row.id);
    },
    destroyMany: async (ids: string[]) => {
      fake.tables.set('orderpoints', table('orderpoints').filter((row) => !ids.includes(row.id)));
      return ids;
    },
  },
}));
vi.mock('src/stock/orderpoint/destroy-processed-suggestions', () => ({ destroyProcessedSuggestions: vi.fn(async () => []) }));
vi.mock('src/stock/orderpoint/orderpoint-routing', () => ({
  readOrderpointRules: vi.fn(
    async (requests: { orderpointId: string }[]) =>
      new Map(requests.map((request) => [request.orderpointId, { kind: 'rules', product: {}, rules: [] }])),
  ),
}));
vi.mock('src/stock/orderpoint/location-quantities', () => ({
  readLocationQuantities: vi.fn(
    async ({ productIds, locationId, toDays }: { productIds: string[]; locationId: string; toDays: string[] }) =>
      new Map(
        toDays.map((toDay) => [
          toDay,
          new Map(productIds.map((productId) => [productId, { virtualAvailable: fake.forecasts.get(`${productId}|${locationId}`) ?? 0 }])),
        ]),
      ),
  ),
}));
vi.mock('src/stock/orderpoint/recompute-orderpoint', () => ({ recomputeOrderpoint: vi.fn(async () => ({ failures: [] })) }));
vi.mock('src/stock/orderpoint/replenishment-issue-tasks', () => ({ addReplenishmentIssueTasks: vi.fn(async () => {}) }));
vi.mock('twenty-sdk/logic-function', () => ({
  enqueueJobs: vi.fn(async () => {
    fake.claimCountAtEnqueue.push(fake.claims?.rows.size ?? -1);
    return { enqueued: true };
  }),
}));

const claims = () => fake.claims as ReturnType<typeof makeFakeClaimStore>;

// WH1 view > Stock > Replenish Location (only the sub-location is a replenish
// location); WH2 view > Stock (a replenish location); Customers outside.
const seed = () => {
  fake.tables.clear();
  fake.claimCountAtEnqueue = [];
  fake.forecasts.clear();
  fake.beforeCreate = null;
  claims().rows.clear();
  vi.clearAllMocks();
  fake.tables.set('stockLocations', [
    { id: 'wh1-view', parentPath: 'wh1-view/', warehouseId: 'wh1', replenishLocation: false, active: true },
    { id: 'wh1-stock', parentPath: 'wh1-view/wh1-stock/', warehouseId: 'wh1', replenishLocation: false, active: true },
    { id: 'wh1-rep', parentPath: 'wh1-view/wh1-stock/wh1-rep/', warehouseId: 'wh1', replenishLocation: true, active: true },
    { id: 'wh2-view', parentPath: 'wh2-view/', warehouseId: 'wh2', replenishLocation: false, active: true },
    { id: 'wh2-stock', parentPath: 'wh2-view/wh2-stock/', warehouseId: 'wh2', replenishLocation: true, active: true },
    { id: 'customers', parentPath: 'customers/', warehouseId: null, replenishLocation: false, active: true },
  ]);
  fake.tables.set('stockWarehouses', [
    { id: 'wh1', active: true, sequence: 1, createdAt: '2026-10-01T00:00:00.000Z' },
    { id: 'wh2', active: true, sequence: 2, createdAt: '2026-10-02T00:00:00.000Z' },
  ]);
  fake.tables.set('productProducts', [
    { id: 'rep', active: true, productTmpl: { isStorable: true } },
    { id: 'super', active: true, productTmpl: { isStorable: true } },
    { id: 'service', active: true, productTmpl: { isStorable: false } },
  ]);
};

const delivery = (id: string, productId: string, locationId: string, productQty: number) => ({
  id,
  productId,
  locationId,
  locationDestId: 'customers',
  locationFinalId: null,
  productQty,
});

const created = () =>
  table('orderpoints').map((row) => ({
    productId: row.productId,
    locationId: row.locationId,
    warehouseId: row.warehouseId,
    trigger: row.trigger,
    productMinQty: row.productMinQty,
    productMaxQty: row.productMaxQty,
    autoCreated: row.autoCreated,
    name: row.name,
  }));

const LATER = () => Date.now() + 60_000;

describe('refreshReplenishmentSuggestions', () => {
  beforeEach(seed);

  it('suggests a manual rule at the replenish sub-location a delivery leaves from, after removing processed rows', async () => {
    fake.tables.set('stockMoves', [delivery('m1', 'rep', 'wh1-rep', 3)]);
    fake.forecasts.set('rep|wh1-rep', -3);

    expect(await refreshReplenishmentSuggestions({ deadlineAt: LATER() })).toEqual({ kind: 'done', created: 1 });
    expect(destroyProcessedSuggestions).toHaveBeenCalledTimes(1);
    expect(created()).toEqual([
      {
        productId: 'rep',
        locationId: 'wh1-rep',
        warehouseId: 'wh1',
        trigger: 'MANUAL',
        productMinQty: 0,
        productMaxQty: 0,
        autoCreated: true,
        name: 'Replenishment Report',
      },
    ]);
    expect(vi.mocked(recomputeOrderpoint).mock.calls).toEqual([[table('orderpoints').map((row) => row.id)]]);
    expect(claims().rows.size).toBe(0);
  });

  it('leaves out products that keep no stock, and needs the lead-time forecast to stay negative', async () => {
    fake.tables.set('stockMoves', [delivery('m1', 'service', 'wh2-stock', 1), delivery('m2', 'super', 'wh2-stock', 1)]);
    fake.forecasts.set('super|wh2-stock', 2);

    expect(await refreshReplenishmentSuggestions({ deadlineAt: LATER() })).toEqual({ kind: 'done', created: 0 });
    expect(created()).toEqual([]);
  });

  it('adds nothing for a pair a stopped run already suggested', async () => {
    fake.tables.set('stockMoves', [delivery('m1', 'rep', 'wh1-rep', 3)]);
    fake.forecasts.set('rep|wh1-rep', -3);

    await refreshReplenishmentSuggestions({ deadlineAt: LATER() });
    expect(await refreshReplenishmentSuggestions({ deadlineAt: LATER() })).toEqual({ kind: 'done', created: 0 });
    expect(table('orderpoints')).toHaveLength(1);
  });

  it('suggests a pair again on a later day after a person moved its suggestion to another location', async () => {
    fake.tables.set('stockMoves', [delivery('m1', 'rep', 'wh1-rep', 3)]);
    fake.forecasts.set('rep|wh1-rep', -3);
    vi.useFakeTimers({ toFake: ['Date'] });

    try {
      vi.setSystemTime(new Date('2026-10-10T08:00:00.000Z'));
      await refreshReplenishmentSuggestions({ deadlineAt: LATER() });
      table('orderpoints')[0].locationId = 'wh1-stock';

      vi.setSystemTime(new Date('2026-10-11T08:00:00.000Z'));
      expect(await refreshReplenishmentSuggestions({ deadlineAt: LATER() })).toEqual({ kind: 'done', created: 1 });
      expect(table('orderpoints').map((row) => row.locationId)).toEqual(['wh1-stock', 'wh1-rep']);
    } finally {
      vi.useRealTimers();
    }
  });

  it('refuses with the loop error found at a later location, removes the rows it made, and frees the refresh', async () => {
    fake.tables.set('stockMoves', [delivery('m1', 'rep', 'wh1-rep', 3), delivery('m2', 'super', 'wh2-stock', 1)]);
    fake.forecasts.set('rep|wh1-rep', -3);
    fake.forecasts.set('super|wh2-stock', -1);
    const error = { message: 'Invalid rule configuration, the following rule causes an endless loop: {rule}', values: { rule: 'Looping Rule' } };
    const loopAtWh2: typeof readOrderpointRules = async (requests) =>
        new Map(
          requests.map((request) => [
            request.orderpointId,
            request.locationId === 'wh2-stock' ? { kind: 'loop', product: {} as never, error } : { kind: 'rules', product: {} as never, rules: [] },
          ]),
        );
    vi.mocked(readOrderpointRules).mockImplementationOnce(loopAtWh2).mockImplementationOnce(loopAtWh2);

    expect(await refreshReplenishmentSuggestions({ deadlineAt: LATER() })).toEqual({ kind: 'refused', error, productId: 'super' });
    expect(created()).toEqual([]);
    expect(claims().rows.size).toBe(0);
  });

  it('answers held while another refresh runs', async () => {
    await claims().store.create({ key: 'replenishment:refresh', runId: 'other', startedAt: claims().store.now().toISOString() });

    expect(await refreshReplenishmentSuggestions({ deadlineAt: LATER() })).toEqual({ kind: 'held', continuing: false });
    expect(destroyProcessedSuggestions).not.toHaveBeenCalled();
  });

  it('answers held and still filling while a background run goes on from an earlier one', async () => {
    fake.tables.set('stockMoves', [delivery('m1', 'rep', 'wh1-rep', 3)]);
    fake.forecasts.set('rep|wh1-rep', -3);
    let seen: unknown = null;
    fake.beforeCreate = () => {
      void refreshReplenishmentSuggestions({ deadlineAt: LATER() }).then((result) => {
        seen = result;
      });
    };

    await refreshReplenishmentSuggestions({ deadlineAt: LATER(), locationIds: ['wh1-rep'] });
    await vi.waitFor(() => expect(seen).toEqual({ kind: 'held', continuing: true }));
  });

  it('leaves a pair to the rule a person saved there meanwhile and suggests the rest', async () => {
    fake.tables.set('stockMoves', [delivery('m1', 'rep', 'wh1-rep', 3), delivery('m2', 'super', 'wh1-rep', 2)]);
    fake.forecasts.set('rep|wh1-rep', -3);
    fake.forecasts.set('super|wh1-rep', -2);
    fake.beforeCreate = () => {
      table('orderpoints').push({ id: 'staff', productId: 'rep', locationId: 'wh1-rep', trigger: 'AUTO' });
    };

    expect(await refreshReplenishmentSuggestions({ deadlineAt: LATER() })).toEqual({ kind: 'done', created: 1 });
    expect(table('orderpoints').map((row) => `${row.id === 'staff' ? 'staff' : 'suggested'}|${row.productId as string}`)).toEqual([
      'staff|rep',
      'suggested|super',
    ]);
    expect(vi.mocked(recomputeOrderpoint).mock.calls).toEqual([[[table('orderpoints')[1].id]]]);
  });

  it('reports a failed create that no rule saved meanwhile explains', async () => {
    fake.tables.set('stockMoves', [delivery('m1', 'rep', 'wh1-rep', 3)]);
    fake.forecasts.set('rep|wh1-rep', -3);
    fake.beforeCreate = () => {
      throw new Error('Rate limit exceeded');
    };

    await expect(refreshReplenishmentSuggestions({ deadlineAt: LATER() })).rejects.toThrow('Rate limit exceeded');
    expect(claims().rows.size).toBe(0);
  });

  it('goes on in a background job asked for once the refresh is free, which keeps the rows made so far', async () => {
    fake.tables.set('stockMoves', [delivery('m1', 'rep', 'wh1-rep', 3), delivery('m2', 'super', 'wh2-stock', 1)]);
    fake.forecasts.set('rep|wh1-rep', -3);
    fake.forecasts.set('super|wh2-stock', -1);

    const first = await refreshReplenishmentSuggestions({ deadlineAt: Date.now() - 1, locale: 'fr-FR' });

    expect(first).toEqual({ kind: 'continued', created: 1, remainingLocationIds: ['wh2-stock'] });
    expect(fake.claimCountAtEnqueue).toEqual([0]);
    expect(vi.mocked(enqueueJobs).mock.calls[0][0].jobs?.map((job) => job.payload)).toEqual([{ locationIds: ['wh2-stock'], locale: 'fr-FR' }]);

    expect(await refreshReplenishmentSuggestions({ deadlineAt: LATER(), locationIds: ['wh2-stock'] })).toEqual({ kind: 'done', created: 1 });
    expect(destroyProcessedSuggestions).toHaveBeenCalledTimes(1);
    expect(created().map((row) => `${row.productId}|${row.locationId}|${row.warehouseId}`)).toEqual(['rep|wh1-rep|wh1', 'super|wh2-stock|wh2']);
  });
});
