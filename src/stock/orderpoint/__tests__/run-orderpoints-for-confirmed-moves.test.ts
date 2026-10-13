import { describe, expect, it } from 'vitest';

import { makeProcureOrderpoints } from 'src/stock/orderpoint/procure-orderpoints';
import { makeRunOrderpointsForConfirmedMoves } from 'src/stock/orderpoint/run-orderpoints-for-confirmed-moves';
import { type ConfirmedMove } from 'src/stock/orderpoint/types/confirmed-move.type';
import { type OrderpointProcureRow } from 'src/stock/orderpoint/types/orderpoint-procure-row.type';
import { type Procurement } from 'src/stock/utils/procurement/types/procurement.type';

// Minimum 0 and maximum 5 on WH/Stock, nothing on hand, a 9-day supply rule;
// a delivery of 12 is marked as to do: 5 - (0 - 12) = 17 to order.
const RECOMPUTED_QTY_TO_ORDER = 17;

const setup = ({ busy = [] as string[] } = {}) => {
  const stored = new Map<string, OrderpointProcureRow>([
    [
      'op-desk',
      {
        id: 'op-desk',
        name: 'OP/00001',
        productId: 'desk',
        productUomId: 'unit',
        locationId: 'stock',
        warehouseId: 'WH',
        routeId: null,
        // What the rule held before the delivery was confirmed.
        qtyToOrder: 0,
        leadHorizonDate: '2026-09-11',
        productTemplateId: 'desk-template',
        productName: 'Desk',
        responsibleId: null,
      },
    ],
  ]);
  const ordered: Procurement[] = [];
  const claims = new Map<string, string>();
  const delivery: ConfirmedMove = {
    id: 'out-1',
    productId: 'desk',
    state: 'CONFIRMED',
    locationId: 'stock',
    locationDestId: 'customers',
    productQty: 12,
    referenceIds: ['ref-out'],
  };
  const procureOrderpoints = makeProcureOrderpoints({
    readOrderpoints: async (ids) => ids.flatMap((id) => (stored.has(id) ? [{ ...(stored.get(id) as OrderpointProcureRow) }] : [])),
    readReferenceNames: async (ids) => new Map(ids.map((id) => [id, id === 'ref-out' ? 'WH/OUT/00001' : id])),
    checkProcurements: async () => {},
    tryProcurements: async (procurements) => {
      ordered.push(...procurements);
      return { kind: 'done', moveIds: procurements.map(() => 'receipt-1') };
    },
    addIssueTasks: async () => {},
    settings: () => ({ horizonDays: 365, digits: 2 }),
  });
  const hook = makeRunOrderpointsForConfirmedMoves({
    readMoves: async (ids) => (ids.includes(delivery.id) ? [delivery] : []),
    readAutoOrderpoints: async () => [
      { id: 'op-desk', productId: 'desk', trigger: 'AUTO', active: true, locationId: 'stock', createdAt: '2026-01-01T00:00:00.000Z', productMinQty: 0 },
    ],
    readLocations: async () => [
      { id: 'wh', parentPath: 'wh/', completeName: 'WH' },
      { id: 'stock', parentPath: 'wh/stock/', completeName: 'WH/Stock' },
      { id: 'customers', parentPath: 'customers/', completeName: 'Customers' },
    ],
    takeOrderpointClaims: async (ids, runId) => {
      const taken = ids.filter((id) => !busy.includes(id));

      taken.forEach((id) => claims.set(id, runId));
      return { taken, busy: ids.filter((id) => busy.includes(id)) };
    },
    releaseOrderpointClaims: async (ids) => {
      ids.forEach((id) => claims.delete(id));
    },
    releaseOrderpointClaimsUnlessWritten: async () => {},
    recomputeOrderpoint: async (ids) => {
      for (const id of ids) {
        const rule = stored.get(id);

        if (rule !== undefined) {
          stored.set(id, { ...rule, qtyToOrder: RECOMPUTED_QTY_TO_ORDER });
        }
      }
      return { failures: [] };
    },
    addIssueTasks: async () => {},
    procureOrderpoints,
    newRunId: () => 'run-1',
  });

  return { hook, ordered, claims };
};

describe('runOrderpointsForConfirmedMoves', () => {
  it('orders what the rule needs once the confirmed delivery counts, not what it held before', async () => {
    const { hook, ordered, claims } = setup();

    await hook(['out-1']);

    expect(ordered).toEqual([
      {
        productId: 'desk',
        productQty: 17,
        productUomId: 'unit',
        locationId: 'stock',
        name: 'OP/00001',
        origin: 'OP/00001 - WH/OUT/00001',
        values: {
          routeIds: [],
          datePlanned: '2025-09-11T12:00:00.000Z',
          dateDeadline: '2025-09-11T12:00:00.000Z',
          warehouseId: 'WH',
          orderpointId: 'op-desk',
          referenceIds: ['ref-out'],
        },
      },
    ]);
    expect([...claims.keys()]).toEqual([]);
  });

  it('leaves a rule another run is ordering to that run', async () => {
    const { hook, ordered } = setup({ busy: ['op-desk'] });

    await hook(['out-1']);

    expect(ordered).toEqual([]);
  });
});
