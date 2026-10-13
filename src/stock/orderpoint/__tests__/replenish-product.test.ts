import { describe, expect, it } from 'vitest';

import { CLAIM_HELD_MESSAGE, claimKey, makeClaims } from 'src/shared/claims/claim';
import { makeFakeClaimStore } from 'src/shared/claims/__tests__/fakes/fake-claim-store';
import { ORDERPOINT_MESSAGES } from 'src/stock/orderpoint/orderpoint-messages.constant';
import { makeReplenishProduct } from 'src/stock/orderpoint/replenish-product';
import { StockUserError } from 'src/stock/stock-errors';
import { ProcurementFailure } from 'src/stock/procurement/apply-procurement-plan';
import { makeClaimedProcurements } from 'src/stock/procurement/claimed-procurements';
import { type ClaimJournal } from 'src/shared/claims/types/claim-journal.type';
import { type Procurement } from 'src/stock/utils/procurement/types/procurement.type';

const replenishment = (quantity: number): Procurement => ({
  productId: 'desk',
  productQty: quantity,
  productUomId: 'unit',
  locationId: 'wh-stock',
  name: 'Manual Replenishment',
  origin: 'Manual Replenishment',
  values: { warehouseId: 'wh', routeIds: [] },
});

const KEY = claimKey('replenish', 'desk');

// The procurement engine as the claim sees it: the plan is stored, the claim
// commits, then the moves are written. `stopAt` stops the server there.
const setup = () => {
  const fake = makeFakeClaimStore();
  const claims = makeClaims(fake.store);
  const written: string[] = [];
  const server = { stopAt: null as 'write' | null, refuse: false, readFails: false };
  const run = async (procurements: Procurement[], journal: ClaimJournal) => {
    const plan = await journal.step(
      'procurement:plan',
      async () => {
        if (server.refuse) {
          throw new ProcurementFailure([
            { message: 'No rule has been found to replenish {product}.', values: { product: 'Desk' } },
          ]);
        }
        return procurements.map((procurement) => `move of ${procurement.productQty}`);
      },
      async () => {},
    );

    await journal.commit();
    await journal.step(
      'procurement:write',
      async () => true,
      async () => {
        if (server.stopAt === 'write') {
          throw new Error('server stopped');
        }
        written.push(...plan);
      },
    );
    return plan;
  };
  const procurements = makeClaimedProcurements({ claims, findClaim: fake.store.findByKey, run });
  const replenish = makeReplenishProduct({
    findClaim: fake.store.findByKey,
    resumeProcurementClaim: procurements.resumeProcurementClaim,
    runClaimedProcurements: procurements.runClaimedProcurements,
    readFirstMove: async ([firstId]) => {
      if (server.readFails) {
        throw new Error('read failed');
      }
      return firstId === undefined
        ? null
        : { quantity: Number(firstId.replace('move of ', '')), unitName: 'Units', pickingName: `WH/IN/${firstId}` };
    },
  });

  return { fake, server, written, replenish };
};

describe('replenishing a product', () => {
  it('orders the quantity once, names its transfer and frees the product', async () => {
    const { fake, written, replenish } = setup();

    expect(await replenish(replenishment(5))).toEqual({ kind: 'ordered', pickingName: 'WH/IN/move of 5' });
    expect(written).toEqual(['move of 5']);
    expect([...fake.rows.keys()]).toEqual([]);
  });

  it('a refused order writes nothing and frees the product at once', async () => {
    const { fake, server, written, replenish } = setup();

    server.refuse = true;
    await expect(replenish(replenishment(5))).rejects.toBeInstanceOf(ProcurementFailure);

    expect(written).toEqual([]);
    expect([...fake.rows.keys()]).toEqual([]);
  });

  it('a second click while an order of the product is still running is told the product is being processed', async () => {
    const { server, written, replenish } = setup();

    server.stopAt = 'write';
    await expect(replenish(replenishment(5))).rejects.toThrow('server stopped');
    server.stopAt = null;

    await expect(replenish(replenishment(3))).rejects.toThrow(CLAIM_HELD_MESSAGE);
    expect(written).toEqual([]);
  });

  it('a click after an order stopped while writing finishes that order and names it, so it is checked before ordering again', async () => {
    const { fake, server, written, replenish } = setup();

    server.stopAt = 'write';
    await expect(replenish(replenishment(5))).rejects.toThrow('server stopped');
    server.stopAt = null;
    fake.advanceMinutes(16);

    const refusal = await replenish(replenishment(3)).catch((error: unknown) => error);

    expect(refusal).toBeInstanceOf(StockUserError);
    expect((refusal as StockUserError).message).toBe(ORDERPOINT_MESSAGES.replenishFinishedEarlier);
    expect((refusal as StockUserError).values).toEqual({ quantity: 5, unit: 'Units', transfer: 'WH/IN/move of 5' });
    expect(written).toEqual(['move of 5']);
    expect([...fake.rows.keys()]).toEqual([]);
  });

  it('a click that finished an earlier order it cannot read back still refuses, asking to check the transfers', async () => {
    const { fake, server, written, replenish } = setup();

    server.stopAt = 'write';
    await expect(replenish(replenishment(5))).rejects.toThrow('server stopped');
    server.stopAt = null;
    server.readFails = true;
    fake.advanceMinutes(16);

    await expect(replenish(replenishment(3))).rejects.toThrow(ORDERPOINT_MESSAGES.replenishFinishedEarlierUnread);
    expect(written).toEqual(['move of 5']);
  });

  it('an order that was written answers as ordered even when its transfer cannot be read back', async () => {
    const { written, server, replenish } = setup();

    server.readFails = true;

    expect(await replenish(replenishment(5))).toEqual({ kind: 'unconfirmed' });
    expect(written).toEqual(['move of 5']);
  });

  it('a negative quantity is refused before anything is claimed or written', async () => {
    const { fake, written, replenish } = setup();

    await expect(replenish(replenishment(-2))).rejects.toThrow(ORDERPOINT_MESSAGES.replenishNegative);
    expect(written).toEqual([]);
    expect([...fake.rows.keys()]).toEqual([]);
  });

  it('a click after an order stopped before its first write orders its own quantity', async () => {
    const { fake, written, replenish } = setup();

    // The server died between storing the plan and passing the commit point.
    fake.rows.set(KEY, {
      id: 'claim',
      key: KEY,
      runId: 'stopped-run',
      startedAt: '2026-10-08T10:00:00.000Z',
      finishedAt: null,
      progress: { steps: { 'procurement:plan': { plan: ['move of 5'], done: true } } },
    });
    fake.advanceMinutes(16);

    expect(await replenish(replenishment(3))).toEqual({ kind: 'ordered', pickingName: 'WH/IN/move of 3' });
    expect(written).toEqual(['move of 3']);
    expect([...fake.rows.keys()]).toEqual([]);
  });

  it('a click while a fresh order has not yet reached its first write is told the product is being processed', async () => {
    const { fake, written, replenish } = setup();

    fake.rows.set(KEY, {
      id: 'claim',
      key: KEY,
      runId: 'running',
      startedAt: '2026-10-08T10:00:00.000Z',
      finishedAt: null,
      progress: null,
    });

    await expect(replenish(replenishment(3))).rejects.toThrow(CLAIM_HELD_MESSAGE);
    expect(written).toEqual([]);
    expect(fake.rows.get(KEY)?.runId).toBe('running');
  });
});
