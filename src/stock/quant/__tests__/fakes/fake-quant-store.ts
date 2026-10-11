import { parseQuantKey } from 'src/stock/quant/quant-key';
import { type QuantSnapshot } from 'src/stock/quant/types/quant-snapshot.type';
import { type QuantStore } from 'src/stock/quant/types/quant-store.type';
import { type ReservationLine } from 'src/stock/quant/types/reservation-line.type';
import { type LocationUsage } from 'src/stock/types/location-usage.type';

type FakeLine = ReservationLine & { key: string };

// Stock rows by key, open lines and done lines. `beforeWrite` lets a test
// slip another writer in between a read and the compare-and-set.
export const makeFakeQuantStore = ({
  usages = {},
  now = '2026-10-08T12:00:00.000Z',
}: { usages?: Record<string, LocationUsage>; now?: string } = {}) => {
  const quants = new Map<string, QuantSnapshot>();
  const openLines: FakeLine[] = [];
  const doneLines: { sourceKey: string; destinationKey: string; quantity: number }[] = [];
  const hooks: { beforeWrite?: (key: string) => void; clashOnCreate: number; compareAndSetCalls: number } = {
    clashOnCreate: 0,
    compareAndSetCalls: 0,
  };
  let counter = 0;

  const keyOf = (id: string) => [...quants.values()].find((quant) => quant.id === id)?.quantKey;

  const store: QuantStore = {
    findByKey: async (key) => {
      const quant = quants.get(key);
      return quant === undefined ? null : { ...quant };
    },
    create: async (key, { quantity, reservedQuantity, inDate }) => {
      if (hooks.clashOnCreate > 0) {
        hooks.clashOnCreate -= 1;
        counter += 1;
        quants.set(key, { id: `q${counter}`, quantKey: key, quantity: 0, reservedQuantity: 0, inDate, version: 0, inventoryQuantitySet: false, inventoryQuantity: null, inventoryDiffQuantity: null });
        return null;
      }
      if (quants.has(key)) {
        return null;
      }
      counter += 1;
      quants.set(key, { id: `q${counter}`, quantKey: key, quantity, reservedQuantity, inDate, version: 0, inventoryQuantitySet: false, inventoryQuantity: null, inventoryDiffQuantity: null });
      return { ...(quants.get(key) as QuantSnapshot) };
    },
    compareAndSet: async (id, version, data) => {
      hooks.compareAndSetCalls += 1;
      const key = keyOf(id);
      if (key === undefined) {
        return false;
      }
      hooks.beforeWrite?.(key);
      const quant = quants.get(key) as QuantSnapshot;
      if (quant.version !== version) {
        return false;
      }
      quants.set(key, { ...quant, ...(data as Partial<QuantSnapshot>) });
      return true;
    },
    locationUsage: async (locationId) => usages[locationId] ?? 'INTERNAL',
    openLines: async (key) => openLines.filter((line) => line.key === key).map((line) => ({ ...line })),
    destroyLines: async (ids) => {
      for (const id of ids) {
        const index = openLines.findIndex((line) => line.id === id);
        if (index >= 0) {
          openLines.splice(index, 1);
        }
      }
    },
    shrinkLine: async (id, quantity, quantityProductUom) => {
      const line = openLines.find((candidate) => candidate.id === id);
      if (line !== undefined) {
        line.quantity = quantity;
        line.quantityProductUom = quantityProductUom;
      }
    },
    ledgerTotal: async (key) =>
      doneLines.reduce(
        (total, line) => total + (line.destinationKey === key ? line.quantity : 0) - (line.sourceKey === key ? line.quantity : 0),
        0,
      ),
    wait: async () => {},
    now: () => now,
    digits: () => 2,
  };

  // Another run writes the same row: the version moves on.
  const writeBehindTheBack = (key: string, change: Partial<QuantSnapshot>) => {
    const quant = quants.get(key) as QuantSnapshot;
    quants.set(key, { ...quant, ...change, version: quant.version + 1 });
  };

  return { store, quants, openLines, doneLines, hooks, writeBehindTheBack, parts: parseQuantKey };
};
