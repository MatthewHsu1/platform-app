import { describe, expect, it } from 'vitest';

import { makeAssignLotsAtValidate } from 'src/stock/lot/validate/assign-lots-at-validate';
import { type AssignLotsStore } from 'src/stock/lot/types/assign-lots-store.type';
import { type ValidateLineRow } from 'src/stock/lot/types/validate-line-row.type';

class Stopped extends Error {}

type FakeLot = {
  id: string;
  productId: string;
  name: string;
  expirationDate: string | null;
  deletedAt?: string | null;
  data?: Record<string, unknown>;
};

const apple = { useExpirationDate: true, expirationTime: 10, useTime: 5, removalTime: 2, alertTime: 6 };

// Lots and lines in memory; the unique (product, name) index of lots is enforced, and a stop can be injected after any write.
class FakeLotStore implements AssignLotsStore {
  readonly lots = new Map<string, FakeLot>();
  readonly lines = new Map<string, ValidateLineRow>();
  readonly notes: string[] = [];
  writes = 0;
  stopAfter: number | null = null;

  private wrote() {
    this.writes += 1;
    if (this.stopAfter === this.writes) {
      this.stopAfter = null;
      throw new Stopped();
    }
  }

  addLine(fields: Partial<ValidateLineRow> & { id: string }) {
    this.lines.set(fields.id, {
      pickingId: 't',
      pickingName: 'WH/IN/00001',
      pickingUsesLots: true,
      moveId: 'm',
      productId: 'p',
      productName: 'Product B',
      tracking: 'LOT',
      quantity: 1,
      productUomId: 'unit',
      quantityProductUom: 1,
      picked: true,
      movePicked: true,
      moveState: 'ASSIGNED',
      isInventory: false,
      isScrap: false,
      hasPickingType: true,
      useCreateLots: true,
      useExistingLots: false,
      lotId: null,
      lotName: null,
      expirationDate: null,
      locationId: 'vendors',
      locationDestId: 'stock',
      moveLocationDestId: 'stock',
      state: 'ASSIGNED',
      packageId: null,
      resultPackageId: null,
      ...fields,
    });
  }

  async readLines(lineIds: string[]) {
    return lineIds.flatMap((id) => {
      const line = this.lines.get(id);
      return line === undefined ? [] : [{ ...line }];
    });
  }

  async findLots(productIds: string[], names: string[]) {
    return [...this.lots.values()]
      .filter((lot) => productIds.includes(lot.productId) && names.includes(lot.name))
      .map((lot) => ({ id: lot.id, name: lot.name, productId: lot.productId, deletedAt: lot.deletedAt ?? null }));
  }

  async restoreLots(lotIds: string[]) {
    lotIds.forEach((id) => {
      const lot = this.lots.get(id);
      if (lot !== undefined) {
        lot.deletedAt = null;
      }
    });
    this.wrote();
  }

  async noteLotsMissing(pickingId: string, productNames: string[]) {
    const text = `${pickingId}: ${productNames.join(', ')}`;
    if (!this.notes.includes(text)) {
      this.notes.push(text);
    }
  }

  async readExpiryTimes() {
    return new Map([['apple', apple]]);
  }

  now() {
    return new Date('2025-03-10T09:00:00.000Z');
  }

  async createMissingLots(rows: { id: string; data: { productId: string; name: string; expirationDate?: string | null } }[]) {
    for (const row of rows) {
      if (this.lots.has(row.id)) {
        continue;
      }
      if ([...this.lots.values()].some((lot) => lot.productId === row.data.productId && lot.name === row.data.name)) {
        throw new Error('A duplicate entry was detected');
      }
      this.lots.set(row.id, {
        id: row.id,
        productId: row.data.productId,
        name: row.data.name,
        expirationDate: row.data.expirationDate ?? null,
        data: row.data,
      });
      this.wrote();
    }
  }

  async pointLines(lineIds: string[], lotId: string) {
    lineIds.forEach((id) => {
      const line = this.lines.get(id);
      if (line !== undefined) {
        line.lotId = lotId;
      }
    });
    this.wrote();
  }
}

const lotOf = (store: FakeLotStore, lineId: string) => store.lots.get(store.lines.get(lineId)?.lotId ?? '')?.name;

describe('assignLotsAtValidate', () => {
  it('makes one lot for the lines naming it and uses a lot that already has its name', async () => {
    const store = new FakeLotStore();
    store.lots.set('lot-abc', { id: 'lot-abc', productId: 'p', name: 'abc', expirationDate: null });
    store.addLine({ id: 'a', lotName: 'abc', quantity: 4 });
    store.addLine({ id: 'b', lotName: 'def' });
    store.addLine({ id: 'c', lotName: 'def' });

    await makeAssignLotsAtValidate(store)(['a', 'b', 'c']);

    expect(store.lines.get('a')?.lotId).toBe('lot-abc');
    expect([lotOf(store, 'b'), lotOf(store, 'c')]).toEqual(['def', 'def']);
    expect(store.lines.get('b')?.lotId).toBe(store.lines.get('c')?.lotId);
    expect(store.lots.size).toBe(2);
  });

  it('gives the new lot the expiration date of its line', async () => {
    const store = new FakeLotStore();
    store.addLine({ id: 'a', lotName: 'L1', expirationDate: '2026-11-01T00:00:00.000Z' });

    await makeAssignLotsAtValidate(store)(['a']);

    expect(store.lots.get(store.lines.get('a')?.lotId ?? '')?.expirationDate).toBe('2026-11-01T00:00:00.000Z');
  });

  it('dates a lot made from a received line by its expiration date and the product days', async () => {
    const store = new FakeLotStore();
    store.addLine({ id: 'a', productId: 'apple', lotName: 'Apple Box #2', expirationDate: '2025-04-09T09:00:00.000Z' });

    await makeAssignLotsAtValidate(store)(['a']);

    expect(store.lots.get(store.lines.get('a')?.lotId ?? '')?.data).toEqual({
      productId: 'apple',
      name: 'Apple Box #2',
      expirationDate: '2025-04-09T09:00:00.000Z',
      useDate: '2025-04-04T09:00:00.000Z',
      removalDate: '2025-04-07T09:00:00.000Z',
      alertDate: '2025-04-03T09:00:00.000Z',
      productExpiryAlert: false,
    });
  });

  it('flags a lot made from a line whose expiration date has passed', async () => {
    const store = new FakeLotStore();
    store.addLine({ id: 'a', productId: 'apple', lotName: 'Apple Box #3', expirationDate: '2025-03-01T00:00:00.000Z' });

    await makeAssignLotsAtValidate(store)(['a']);

    expect(store.lots.get(store.lines.get('a')?.lotId ?? '')?.data?.productExpiryAlert).toBe(true);
  });

  it('makes no second lot when the server stopped between making the lot and pointing the lines at it', async () => {
    const store = new FakeLotStore();
    store.addLine({ id: 'a', tracking: 'SERIAL', lotName: 'S1' });
    store.addLine({ id: 'b', tracking: 'SERIAL', lotName: 'S2' });
    store.stopAfter = 1;

    await expect(makeAssignLotsAtValidate(store)(['a', 'b'])).rejects.toBeInstanceOf(Stopped);
    await makeAssignLotsAtValidate(store)(['a', 'b']);

    expect(store.lots.size).toBe(2);
    expect([lotOf(store, 'a'), lotOf(store, 'b')]).toEqual(['S1', 'S2']);
  });

  it('restores a deleted lot with the typed name and uses it, instead of making a second one', async () => {
    const store = new FakeLotStore();
    store.lots.set('lot-old', { id: 'lot-old', productId: 'p', name: 'L1', expirationDate: null, deletedAt: '2026-10-01T00:00:00.000Z' });
    store.addLine({ id: 'a', lotName: 'L1' });

    await makeAssignLotsAtValidate(store)(['a']);

    expect(store.lines.get('a')?.lotId).toBe('lot-old');
    expect(store.lots.get('lot-old')?.deletedAt).toBeNull();
    expect(store.lots.size).toBe(1);
  });

  it('restores only the deleted lot a line asks for, not one of another product with the name', async () => {
    const store = new FakeLotStore();
    const trashed = '2026-10-01T00:00:00.000Z';
    store.lots.set('a-l1', { id: 'a-l1', productId: 'pa', name: 'L1', expirationDate: null, deletedAt: trashed });
    store.lots.set('b-l2', { id: 'b-l2', productId: 'pb', name: 'L2', expirationDate: null, deletedAt: trashed });
    store.addLine({ id: 'a', productId: 'pa', lotName: 'L2' });
    store.addLine({ id: 'b', productId: 'pb', lotName: 'L1' });
    store.addLine({ id: 'c', productId: 'pb', lotName: 'L2' });

    await makeAssignLotsAtValidate(store)(['a', 'b', 'c']);

    expect(store.lines.get('c')?.lotId).toBe('b-l2');
    expect(store.lots.get('b-l2')?.deletedAt).toBeNull();
    expect(store.lots.get('a-l1')?.deletedAt).toBe(trashed);
  });

  it('notes on the transfer a line it has to leave without a lot', async () => {
    const store = new FakeLotStore();
    store.addLine({ id: 'a', lotName: 'L1' });
    store.addLine({ id: 'b', productName: 'Product C', lotName: null });

    await makeAssignLotsAtValidate(store)(['a', 'b']);
    await makeAssignLotsAtValidate(store)(['a', 'b']);

    expect(lotOf(store, 'a')).toBe('L1');
    expect(store.notes).toEqual(['t: Product C']);
  });

  it('leaves lines that already have a lot or are done alone', async () => {
    const store = new FakeLotStore();
    store.addLine({ id: 'a', lotName: 'L1', lotId: 'lot-old' });
    store.addLine({ id: 'b', lotName: 'L2', state: 'DONE' });

    await makeAssignLotsAtValidate(store)(['a', 'b']);

    expect(store.lots.size).toBe(0);
    expect(store.lines.get('a')?.lotId).toBe('lot-old');
    expect(store.lines.get('b')?.lotId).toBeNull();
  });
});
