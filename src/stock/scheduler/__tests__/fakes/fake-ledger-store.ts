import { type LedgerStore } from 'src/stock/scheduler/types/ledger-store.type';
import { type LedgerQuant } from 'src/stock/utils/types/ledger-quant.type';

type FakeQuant = LedgerQuant & { productId: string };

type FakeState = { totals: Map<string, number>; quants: FakeQuant[] };

// Stores ledger totals, stock rows and soft-deleted rows. The hooks let a test change them at a point of the run:
// `onWait` during the wait (a posting landing, another run moving the row), `onCompareAndSet` and `onCreateQuant`
// just before that write (another run writing first).
export const makeFakeLedgerStore = ({
  totals,
  quants,
  storable,
  trashed = [],
  onWait = () => {},
  onCompareAndSet = () => {},
  onCreateQuant = () => {},
}: {
  totals: Map<string, number>;
  quants: FakeQuant[];
  storable: string[];
  trashed?: FakeQuant[];
  onWait?: (state: FakeState) => void;
  onCompareAndSet?: (state: FakeState) => void;
  onCreateQuant?: (state: FakeState) => void;
}) => {
  const state = { totals, quants, trashed, notes: [] as { quantId: string; body: string }[], waits: [] as number[] };
  const productOf = (key: string) => key.split('|')[0];

  const store: LedgerStore = {
    storableProductIds: async () => [...storable],
    ledgerTotals: async (productIds) =>
      new Map([...state.totals].filter(([key]) => productIds.includes(productOf(key)))),
    quants: async (productIds) =>
      state.quants.filter((quant) => productIds.includes(quant.productId)).map((quant) => ({ ...quant })),
    compareAndSet: async (id, version, data) => {
      onCompareAndSet(state);
      const quant = state.quants.find((candidate) => candidate.id === id);

      if (quant === undefined || quant.version !== version) {
        return false;
      }
      Object.assign(quant, data);
      return true;
    },
    createQuant: async (key, quantity) => {
      onCreateQuant(state);
      if (state.quants.some((quant) => quant.quantKey === key)) {
        return null;
      }
      const id = `q-new-${state.quants.length}`;
      state.quants.push({ id, quantKey: key, quantity, reservedQuantity: 0, version: 0, productId: productOf(key) });
      return id;
    },
    restoreQuant: async (key) => {
      const index = state.trashed.findIndex((quant) => quant.quantKey === key);

      if (index === -1) {
        return null;
      }
      const [restored] = state.trashed.splice(index, 1);
      state.quants.push(restored);
      return { ...restored };
    },
    addNote: async (quantId, body) => {
      state.notes.push({ quantId, body });
    },
    wait: async (ms) => {
      state.waits.push(ms);
      onWait(state);
    },
    now: () => '2026-10-08T12:00:00.000Z',
    digits: () => 2,
  };

  return { store, state };
};
