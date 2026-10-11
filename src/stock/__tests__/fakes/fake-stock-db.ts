import { makeReservationRelease } from 'src/stock/move-line/free-reservation';
import { makeApplyQuantDelta } from 'src/stock/quant/apply-quant-delta';
import { destinationKeyOf, parseQuantKey, sourceKeyOf } from 'src/stock/quant/quant-key';
import { makeRecomputeReserved } from 'src/stock/quant/recompute-reserved';
import { makeSettleQuantDelta } from 'src/stock/quant/settle-quant-delta';
import { MOVE_STATE, OPEN_LINE_STATES, PROCURE_METHOD } from 'src/stock/stock-options.constant';
import { planOwnerOnTransferDone } from 'src/stock/utils/plan-consignment.util';
import { planMoveState } from 'src/stock/utils/plan-move-state.util';
import { bypassesReservation } from 'src/stock/utils/location-usage.util';
import { planInDate } from 'src/stock/utils/plan-quant-delta.util';
import { type ClaimJournal } from 'src/shared/claims/types/claim-journal.type';
import { type LotCompensation } from 'src/stock/lot/types/lot-compensation.type';
import { type FreeReservationStore } from 'src/stock/move-line/types/free-reservation-store.type';
import { type DoneMoveData } from 'src/stock/move/types/done-move-data.type';
import { type DoneMovesStore } from 'src/stock/move/types/done-moves-store.type';
import { type PackagesAfterDonePlan } from 'src/stock/package/types/packages-after-done-plan.type';
import { type SplitMoveCreate } from 'src/stock/move/types/split-move-create.type';
import { type BackorderSource } from 'src/stock/picking/types/backorder-source.type';
import { type CreateBackorderStore } from 'src/stock/picking/types/create-backorder-store.type';
import { type ValidateRunPicking } from 'src/stock/picking/types/validate-run-picking.type';
import { type ValidateRunStore } from 'src/stock/picking/types/validate-run-store.type';
import { type QuantSnapshot } from 'src/stock/quant/types/quant-snapshot.type';
import { type QuantStore } from 'src/stock/quant/types/quant-store.type';
import { type LocationUsage } from 'src/stock/types/location-usage.type';
import { type MoveState } from 'src/stock/types/move-state.type';
import { type PickingRow } from 'src/stock/types/picking-row.type';
import { type PickingState } from 'src/stock/types/picking-state.type';
import { type PickingTypeCode } from 'src/stock/types/picking-type-code.type';
import { type ProcureMethod } from 'src/stock/types/procure-method.type';
import { type ReservationMethod } from 'src/stock/types/reservation-method.type';
import { type FreeReservationCandidate } from 'src/stock/utils/types/free-reservation-candidate.type';
import { type FreeReservationPlan } from 'src/stock/utils/types/free-reservation-plan.type';
import { type ResolvedUom } from 'src/uom/utils/types/resolved-uom.type';

export const FAKE_NOW = '2026-10-08T12:00:00.000Z';
export const OPENING_IN_DATE = '2026-01-01T00:00:00.000Z';
const UOMS = new Map<string, ResolvedUom>([['unit', { id: 'unit', name: 'Units', factor: 1, rootId: 'unit', parentPath: 'unit/' }]]);

export class CrashError extends Error {
  constructor(write: number) {
    super(`crash injected after write ${write}`);
    this.name = 'CrashError';
  }
}

// Runs a flow into an injected stop after write `crashAt`. A clean run ends with its claim's clean-up, its last two
// writes (`cleanWrites` is the clean run's write count): a stop there comes after the work is done, and the flow
// may answer as finished. Any other stop must surface as the crash.
export const runIntoCrash = async (
  run: Promise<unknown>,
  { crashAt, cleanWrites }: { crashAt: number; cleanWrites: number | null },
) => {
  const outcome = await run.then(
    () => 'finished' as const,
    (error: unknown) => {
      if (!(error instanceof CrashError)) {
        throw error;
      }
      return 'crashed' as const;
    },
  );

  if (outcome === 'finished' && (cleanWrites === null || crashAt <= cleanWrites - 2)) {
    throw new Error(`The run finished although it stopped after write ${crashAt}, before its claim's clean-up.`);
  }

  return outcome;
};

type FakeMove = {
  id: string;
  productId: string;
  state: MoveState;
  picked: boolean;
  productUomQty: number;
  isInventory: boolean;
  procureMethod: ProcureMethod;
  pickingId: string | null;
  locationId: string;
  locationDestId: string;
  date: string;
  moveOrigIds: string[];
  restrictPartnerId: string | null;
  referenceIds: string[];
};
type FakeLine = {
  id: string;
  moveId: string | null;
  pickingId: string | null;
  productId: string;
  state: MoveState;
  quantity: number;
  picked: boolean;
  locationId: string;
  locationDestId: string;
  ownerId: string | null;
  lotId?: string | null;
  packageId?: string | null;
  resultPackageId?: string | null;
  createdAt: string;
  date: string | null;
};
type FakePicking = {
  id: string;
  name: string;
  state: PickingState;
  ownerId: string | null;
  pickingTypeCode: PickingTypeCode;
  scheduledDate: string;
  backorderId: string | null;
  dateDone: string | null;
  priority: string;
  reservationMethod: ReservationMethod;
  referenceSequenceId: string | null;
};
type JournalProgress = Map<string, { plan: unknown; done: boolean }>;

// The claim journal's contract over a map; plans go through JSON as they do on the claim row.
export const memoryJournal = (resumed = false, progress: JournalProgress = new Map()): ClaimJournal & { progress: JournalProgress } => ({
  runId: 'run-test',
  resumed,
  committed: resumed,
  progress,
  step: async <TPlan>(name: string, plan: () => Promise<TPlan>, work: (stored: TPlan) => Promise<void>) => {
    const saved = progress.get(name);

    if (saved?.done === true) {
      return saved.plan as TPlan;
    }
    const value = saved === undefined ? (JSON.parse(JSON.stringify(await plan())) as TPlan) : (saved.plan as TPlan);

    progress.set(name, { plan: value, done: false });
    await work(value);
    progress.set(name, { plan: value, done: true });
    return value;
  },
  commit: async () => {},
});

const isLive = (state: MoveState) => state !== MOVE_STATE.DONE && state !== MOVE_STATE.CANCEL;

// Rows in memory behind the stores of the Validate run. It decides no rule: the stock level,
// in-date, ledger and reserved rules are the quant engine's own over `quantStore`, and a
// move's state comes from planMoveState; the other flows are recorders, except that
// cancel and confirm write the state the tests read. Every write is counted, and a crash can be
// injected after any of them.
export class FakeStockDb implements DoneMovesStore, FreeReservationStore, CreateBackorderStore, ValidateRunStore {
  readonly moves = new Map<string, FakeMove>();
  readonly lines = new Map<string, FakeLine>();
  readonly pickings = new Map<string, FakePicking>();
  readonly quants = new Map<string, QuantSnapshot>();
  readonly opening = new Map<string, number>();
  readonly usage = new Map<string, LocationUsage>();
  readonly storable = new Set<string>();
  readonly notes: string[] = [];
  readonly compensations = new Map<string, LotCompensation>();
  readonly calls: { name: string; ids: string[] }[] = [];
  writeCount = 0;
  crashAt: number | null = null;
  crashed = false;
  private idCounter = 0;
  private quantCounter = 0;
  private sequenceCounter = 0;
  private gate: Promise<void> | null = null;
  private onGate: (() => void) | null = null;

  readonly quantStore: QuantStore = {
    findByKey: async (key) => {
      const quant = this.quants.get(key);
      return quant === undefined ? null : { ...quant };
    },
    create: async (key, { quantity, reservedQuantity, inDate }) => {
      if (this.quants.has(key)) {
        return null;
      }
      this.quantCounter += 1;
      this.quants.set(key, {
        id: `quant-${this.quantCounter}`,
        quantKey: key,
        quantity,
        reservedQuantity,
        inDate,
        version: 0,
        inventoryQuantitySet: false,
        inventoryQuantity: null,
        inventoryDiffQuantity: null,
      });
      return { ...(this.quants.get(key) as QuantSnapshot) };
    },
    compareAndSet: async (id, version, data) => {
      const quant = [...this.quants.values()].find((row) => row.id === id);

      if (quant === undefined || quant.version !== version) {
        return false;
      }
      this.quants.set(quant.quantKey, { ...quant, ...(data as Partial<QuantSnapshot>) });
      return true;
    },
    locationUsage: async (locationId) => this.usage.get(locationId) ?? 'INTERNAL',
    openLines: async (key) =>
      [...this.lines.values()]
        .filter((line) => OPEN_LINE_STATES.includes(line.state) && sourceKeyOf(line) === key)
        .map((line) => ({
          id: line.id,
          moveId: line.moveId,
          quantity: line.quantity,
          quantityProductUom: line.quantity,
          picked: line.picked,
          createdAt: line.createdAt,
        })),
    destroyLines: async (ids) => {
      ids.forEach((id) => this.lines.delete(id));
    },
    shrinkLine: async (id, quantity) => {
      const line = this.lines.get(id);
      if (line !== undefined) {
        line.quantity = quantity;
      }
    },
    // The opening balance stands for the done lines that made it.
    ledgerTotal: async (key) =>
      [...this.compensations.values()].reduce(
        (total, row) => total + (row.lotKey === key ? row.quantity : 0) - (row.noLotKey === key ? row.quantity : 0),
        [...this.lines.values()]
          .filter((line) => line.state === MOVE_STATE.DONE)
          .reduce(
            (total, line) =>
              total + (destinationKeyOf(line) === key ? line.quantity : 0) - (sourceKeyOf(line) === key ? line.quantity : 0),
            this.opening.get(key) ?? 0,
          ),
      ),
    wait: async () => {},
    now: () => FAKE_NOW,
    digits: () => 2,
  };

  private readonly quantDelta = makeApplyQuantDelta(this.quantStore);
  private readonly settle = makeSettleQuantDelta(this.quantStore);
  private readonly reservedRecompute = makeRecomputeReserved(this.quantStore);
  private readonly release = makeReservationRelease(this);

  // Called after a write took effect; a crash injected here leaves the write in place.
  wrote(name: string, ids: string[] = []) {
    this.writeCount += 1;
    this.calls.push({ name, ids });
    if (this.crashAt === this.writeCount) {
      this.crashed = true;
      throw new CrashError(this.writeCount);
    }
  }

  // The server is back: no crash planned, writes land again.
  restart() {
    this.crashAt = null;
    this.crashed = false;
  }

  idsOf(name: string) {
    return this.calls.filter((call) => call.name === name).flatMap((call) => call.ids);
  }

  addPicking(row: Partial<FakePicking> & { id: string }) {
    this.pickings.set(row.id, {
      name: row.id,
      state: 'ASSIGNED',
      ownerId: null,
      pickingTypeCode: 'OUTGOING',
      scheduledDate: FAKE_NOW,
      backorderId: null,
      dateDone: null,
      priority: 'URGENT',
      reservationMethod: 'MANUAL',
      referenceSequenceId: 'seq-out',
      ...row,
    });
  }

  addMove(row: Partial<FakeMove> & { id: string; productId: string; productUomQty: number }) {
    this.moves.set(row.id, {
      state: 'CONFIRMED',
      picked: false,
      isInventory: false,
      procureMethod: PROCURE_METHOD.MAKE_TO_STOCK,
      pickingId: null,
      locationId: 'stock',
      locationDestId: 'customers',
      date: FAKE_NOW,
      moveOrigIds: [],
      restrictPartnerId: null,
      referenceIds: [],
      ...row,
    });
  }

  addLine(row: Partial<FakeLine> & { id: string; moveId: string; quantity: number }) {
    const move = this.moves.get(row.moveId);

    if (move === undefined) {
      throw new Error(`no move ${row.moveId}`);
    }
    this.lines.set(row.id, {
      pickingId: move.pickingId,
      productId: move.productId,
      state: 'ASSIGNED',
      picked: false,
      locationId: move.locationId,
      locationDestId: move.locationDestId,
      ownerId: null,
      createdAt: FAKE_NOW,
      date: null,
      ...row,
    });
  }

  setOpening(key: string, quantity: number) {
    this.opening.set(key, quantity);
    this.quantCounter += 1;
    this.quants.set(key, {
      id: `quant-${this.quantCounter}`,
      quantKey: key,
      quantity,
      reservedQuantity: 0,
      inDate: OPENING_IN_DATE,
      version: 0,
      inventoryQuantitySet: false,
      inventoryQuantity: null,
      inventoryDiffQuantity: null,
    });
  }

  // Setup only (not counted): every key's reserved as the engine writes it.
  async syncReserved() {
    await this.reservedRecompute([...new Set([...this.quants.keys(), ...[...this.lines.values()].map((line) => sourceKeyOf(line))])]);
  }

  // Holds every commit until released, so a second click can arrive mid-run.
  gateCommits() {
    let open: () => void = () => {};
    this.gate = new Promise<void>((resolve) => {
      open = resolve;
    });
    const reached = new Promise<void>((resolve) => {
      this.onGate = resolve;
    });
    return {
      reached,
      release: () => {
        this.gate = null;
        open();
      },
    };
  }

  snapshot() {
    const round = (value: number) => Math.round(value * 1e6) / 1e6;
    const kind = (pickingId: string | null) =>
      pickingId === null ? 'none' : this.pickings.get(pickingId)?.backorderId === null ? 'original' : 'backorder';

    return {
      quants: [...this.quants.entries()]
        .map(([key, quant]) => `${key}=${round(quant.quantity)}/${round(quant.reservedQuantity)}@${quant.inDate ?? ''}`)
        .sort(),
      moves: [...this.moves.values()]
        .map(
          (move) =>
            `${move.productId}|${move.state}|${round(move.productUomQty)}|${kind(move.pickingId)}|${move.procureMethod}|${move.referenceIds.join(',')}`,
        )
        .sort(),
      lines: [...this.lines.values()]
        .map((line) => `${line.productId}|${line.state}|${round(line.quantity)}|${kind(line.pickingId)}|${String(line.picked)}`)
        .sort(),
      pickings: [...this.pickings.values()].map((row) => `${kind(row.id)}|${row.state}|${row.dateDone ?? ''}|${row.priority}`).sort(),
      // A number taken before a stop is a gap, as sequences allow: a note is compared by the transfer it names.
      notes: this.notes
        .map((note) =>
          [...this.pickings.values()].reduce((text, row) => text.split(row.name).join(`<${kind(row.id)}>`), note),
        )
        .sort(),
    };
  }

  // DoneMovesStore
  digits() {
    return 2;
  }

  now() {
    return FAKE_NOW;
  }

  newId() {
    this.idCounter += 1;
    return `new-${this.idCounter}`;
  }

  async uoms() {
    return UOMS;
  }

  private openDestinations(moveId: string) {
    return [...this.moves.values()].filter((move) => move.moveOrigIds.includes(moveId) && isLive(move.state)).map((move) => move.id);
  }

  async readMoves(moveIds: string[]): Promise<DoneMoveData[]> {
    return moveIds.flatMap((id) => {
      const move = this.moves.get(id);

      if (move === undefined) {
        return [];
      }
      const picking = move.pickingId === null ? undefined : this.pickings.get(move.pickingId);

      return [
        {
          id: move.id,
          state: move.state,
          picked: move.picked,
          productUomQty: move.productUomQty,
          productQty: move.productUomQty,
          isInventory: move.isInventory,
          productId: move.productId,
          productUomId: 'unit',
          productUnitUomId: 'unit',
          isStorable: this.storable.has(move.productId),
          pickingId: move.pickingId,
          pickingTypeCode: picking?.pickingTypeCode ?? null,
          procureMethod: move.procureMethod,
          moveOrigIds: move.moveOrigIds,
          openMoveDestIds: this.openDestinations(move.id),
          referenceIds: move.referenceIds,
          copyValues: {
            productId: move.productId,
            pickingId: move.pickingId,
            locationId: move.locationId,
            locationDestId: move.locationDestId,
            procureMethod: move.procureMethod,
            date: move.date,
          },
          lines: [...this.lines.values()]
            .filter((line) => line.moveId === move.id)
            .map((line) => ({
              id: line.id,
              state: line.state,
              quantity: line.quantity,
              productUomId: 'unit',
              quantityProductUom: line.quantity,
              picked: line.picked,
              productId: line.productId,
              locationId: line.locationId,
              locationDestId: line.locationDestId,
              ownerId: line.ownerId,
              lotId: line.lotId ?? null,
              packageId: line.packageId ?? null,
              resultPackageId: line.resultPackageId ?? null,
            })),
        },
      ];
    });
  }

  async confirmMoves(moveIds: string[]) {
    for (const id of moveIds) {
      const move = this.moves.get(id);
      if (move !== undefined && move.state === MOVE_STATE.DRAFT) {
        move.state = move.moveOrigIds.length > 0 ? MOVE_STATE.WAITING : MOVE_STATE.CONFIRMED;
      }
    }
    this.wrote('confirmMoves', moveIds);
    return moveIds;
  }

  async cancelMoves(moveIds: string[]) {
    for (const id of moveIds) {
      const move = this.moves.get(id);
      if (move !== undefined) {
        move.state = MOVE_STATE.CANCEL;
        move.picked = false;
      }
      [...this.lines.values()].filter((line) => line.moveId === id && line.state !== MOVE_STATE.DONE).forEach((line) => this.lines.delete(line.id));
    }
    this.wrote('cancelMoves', moveIds);
  }

  async destroyLines(lineIds: string[]) {
    lineIds.forEach((id) => this.lines.delete(id));
    this.wrote('destroyLines', lineIds);
  }

  async createSplitMoves(rows: SplitMoveCreate[]) {
    for (const row of rows) {
      if (!this.moves.has(row.id)) {
        this.addMove({
          id: row.id,
          productId: String(row.values.productId),
          productUomQty: Number(row.values.productUomQty),
          state: MOVE_STATE.DRAFT,
          procureMethod: row.values.procureMethod as ProcureMethod,
          pickingId: (row.values.pickingId as string | null) ?? null,
          locationId: String(row.values.locationId),
          locationDestId: String(row.values.locationDestId),
          moveOrigIds: [...row.moveOrigIds],
          referenceIds: [...row.referenceIds],
        });
      }
      for (const destinationId of row.moveDestIds) {
        const destination = this.moves.get(destinationId);
        if (destination !== undefined && !destination.moveOrigIds.includes(row.id)) {
          destination.moveOrigIds.push(row.id);
        }
      }
    }
    this.wrote(
      'createSplitMoves',
      rows.map((row) => row.id),
    );
  }

  async updateMoves(updates: { id: string; data: Record<string, unknown> }[]) {
    for (const update of updates) {
      const move = this.moves.get(update.id);
      if (move !== undefined) {
        Object.assign(move, update.data);
      }
    }
    this.wrote(
      'updateMoves',
      updates.map((update) => update.id),
    );
  }

  async commitLine(lineId: string, date: string) {
    if (this.gate !== null) {
      this.onGate?.();
      await this.gate;
    }
    const line = this.lines.get(lineId);
    if (line !== undefined) {
      line.state = MOVE_STATE.DONE;
      line.date = date;
    }
    this.wrote('commitLine', [lineId]);
  }

  async applyQuantDelta(args: { key: string; delta: number; inDate: string | null }) {
    const result = await this.quantDelta(args);
    this.wrote('applyQuantDelta', [args.key]);
    return result;
  }

  async settleQuantDelta(args: { key: string; delta: number; inDate: string | null }) {
    const result = await this.settle(args);
    this.wrote('settleQuantDelta', [args.key]);
    return result;
  }

  planReservationRelease(args: { key: string; shortfall: number; pickingId: string | null; ignoreLineIds: string[] }) {
    return this.release.plan(args);
  }

  releaseReservation(key: string, plan: FreeReservationPlan) {
    return this.release.apply(key, plan);
  }

  async recomputeReserved(keys: string[]) {
    await this.reservedRecompute(keys);
    this.wrote('recomputeReserved', keys);
  }

  async readAvailable(key: string) {
    const quant = this.quants.get(key);
    return quant === undefined ? 0 : quant.quantity - quant.reservedQuantity;
  }

  async readLotCompensation(id: string) {
    const row = this.compensations.get(id);
    return row === undefined ? null : { ...row };
  }

  async createLotCompensation(row: LotCompensation) {
    if (this.compensations.has(row.id)) {
      return false;
    }
    this.compensations.set(row.id, { ...row });
    this.wrote('createLotCompensation', [row.id]);
    return true;
  }

  async applyTrackingOnDone(lineIds: string[]) {
    this.wrote('applyTrackingOnDone', lineIds);
  }

  async planPackagesAfterDone(
    _lineIds: string[],
    _options: { skipContainers: boolean; siblingPickingIds: string[] },
  ): Promise<PackagesAfterDonePlan> {
    return { containerWrites: [], notes: [], emptyRowKeys: [] };
  }

  async applyPackagesAfterDone(_plan: PackagesAfterDonePlan) {}

  async recomputeMove(moveIds: string[]) {
    for (const id of moveIds) {
      const move = this.moves.get(id);

      if (move === undefined) {
        continue;
      }
      const moveLines = [...this.lines.values()].filter((line) => line.moveId === id);
      move.state =
        planMoveState(
          {
            state: move.state,
            quantity: moveLines.reduce((sum, line) => sum + line.quantity, 0),
            productUomQty: move.productUomQty,
            procureMethod: move.procureMethod,
            originMoves: move.moveOrigIds.flatMap((originId) => {
              const origin = this.moves.get(originId);
              return origin === undefined ? [] : [{ productUomQty: origin.productUomQty, state: origin.state }];
            }),
          },
          this.digits(),
        ) ?? move.state;
      moveLines.forEach((line) => {
        line.state = move.state;
      });
    }
    this.wrote('recomputeMove', moveIds);
  }

  async recomputePickingState(pickingIds: string[]) {
    this.wrote('recomputePickingState', pickingIds);
  }

  async recomputeProductQuantities(productIds: string[]) {
    this.wrote('recomputeProductQuantities', productIds);
  }

  async recomputeTrackingForKeys(_keys: string[]) {}

  async pushApply(moveIds: string[]) {
    this.wrote('pushApply', moveIds);
  }

  async assignMoves(moveIds: string[]) {
    this.wrote('assignMoves', moveIds);
  }

  async retryWaitingMoves(moveIds: string[]) {
    this.wrote('retryWaitingMoves', moveIds);
  }

  async readOpenDestinationMoveIds(moveIds: string[]) {
    return [...new Set(moveIds.flatMap((id) => this.openDestinations(id)))];
  }

  // FreeReservationStore
  async bypassesReservation(key: string) {
    return bypassesReservation(this.usage.get(parseQuantKey(key).locationId) ?? 'INTERNAL');
  }

  async readCandidates(key: string, ignoreLineIds: string[]): Promise<FreeReservationCandidate[]> {
    return [...this.lines.values()]
      .filter(
        (line) =>
          OPEN_LINE_STATES.includes(line.state) &&
          !line.picked &&
          line.quantity > 0 &&
          sourceKeyOf(line) === key &&
          !ignoreLineIds.includes(line.id),
      )
      .map((line) => {
        const move = line.moveId === null ? undefined : this.moves.get(line.moveId);
        const picking = line.pickingId === null ? undefined : this.pickings.get(line.pickingId);
        return {
          lineId: line.id,
          moveId: line.moveId,
          pickingId: line.pickingId,
          scheduledDate: picking?.scheduledDate ?? move?.date ?? null,
          createdAt: line.createdAt,
          quantityProductUom: line.quantity,
        };
      });
  }

  async shrinkLine(lineId: string, quantityProductUom: number) {
    const line = this.lines.get(lineId);
    if (line !== undefined) {
      line.quantity = quantityProductUom;
    }
    this.wrote('shrinkLine', [lineId]);
  }

  async makeMovesToStock(moveIds: string[]) {
    for (const id of moveIds) {
      const move = this.moves.get(id);
      if (move !== undefined) {
        move.procureMethod = PROCURE_METHOD.MAKE_TO_STOCK;
        move.moveOrigIds = [];
      }
    }
    this.wrote('makeMovesToStock', moveIds);
  }

  // ValidateRunStore
  async readPickingForRun(pickingId: string): Promise<ValidateRunPicking | null> {
    const picking = this.pickings.get(pickingId);

    if (picking === undefined) {
      return null;
    }
    const moveIds = [...this.moves.values()].filter((move) => move.pickingId === pickingId && isLive(move.state)).map((move) => move.id);

    return {
      id: picking.id,
      state: picking.state,
      ownerId: picking.ownerId,
      pickingTypeCode: picking.pickingTypeCode,
      moveIds,
    };
  }

  async readOwnerChange(moveIds: string[], ownerId: string) {
    const moves = [...this.moves.values()].filter((move) => moveIds.includes(move.id));
    const lines = [...this.lines.values()].filter((line) => line.moveId !== null && moveIds.includes(line.moveId));
    const { moveUpdates, lineUpdates } = planOwnerOnTransferDone({ pickingOwnerId: ownerId, moves, lines });
    const changedLineIds = new Set(lineUpdates.map((update) => update.id));

    return {
      moveIds: moveUpdates.map((update) => update.id),
      lineIds: lineUpdates.map((update) => update.id),
      keys: [
        ...new Set(lines.filter((line) => changedLineIds.has(line.id)).flatMap((line) => [sourceKeyOf(line), sourceKeyOf({ ...line, ownerId })])),
      ],
    };
  }

  async writeOwner({ moveIds, lineIds, ownerId }: { moveIds: string[]; lineIds: string[]; ownerId: string }) {
    moveIds.forEach((id) => {
      const move = this.moves.get(id);
      if (move !== undefined) {
        move.restrictPartnerId = ownerId;
      }
    });
    lineIds.forEach((id) => {
      const line = this.lines.get(id);
      if (line !== undefined) {
        line.ownerId = ownerId;
      }
    });
    this.wrote('writeOwner', [...moveIds, ...lineIds]);
  }

  async updatePicking(pickingId: string, data: Record<string, unknown>) {
    const picking = this.pickings.get(pickingId);
    if (picking !== undefined) {
      Object.assign(picking, data);
    }
    this.wrote('updatePicking', [pickingId]);
  }

  // CreateBackorderStore
  async readBackorderSource(pickingId: string): Promise<BackorderSource | null> {
    const picking = this.pickings.get(pickingId);

    if (picking === undefined) {
      return null;
    }
    const row: PickingRow = {
      id: picking.id,
      name: picking.name,
      origin: null,
      state: picking.state,
      priority: picking.priority === 'URGENT' ? 'URGENT' : 'NORMAL',
      scheduledDate: picking.scheduledDate,
      dateDeadline: null,
      hasDeadlineIssue: false,
      delayAlertDate: null,
      dateDone: picking.dateDone,
      locationId: 'stock',
      locationDestId: 'customers',
      pickingTypeId: 'type-out',
      pickingTypeCode: picking.pickingTypeCode,
      companyId: null,
      personId: null,
      responsibleUserId: null,
      ownerId: picking.ownerId,
      printed: false,
      isLocked: true,
      moveType: 'DIRECT',
      backorderId: picking.backorderId,
      returnPickingId: null,
      createdAt: FAKE_NOW,
    };

    return {
      picking: row,
      note: null,
      reservationMethod: picking.reservationMethod,
      referenceSequenceId: picking.referenceSequenceId,
      liveMoveIds: [...this.moves.values()].filter((move) => move.pickingId === pickingId && isLive(move.state)).map((move) => move.id),
    };
  }

  async readPickingName(pickingId: string) {
    return this.pickings.get(pickingId)?.name ?? null;
  }

  async nextNumber(_sequenceId: string) {
    this.sequenceCounter += 1;
    this.wrote('nextNumber');
    return `WH/OUT/${String(this.sequenceCounter).padStart(5, '0')}`;
  }

  async createPicking(pickingId: string, data: Record<string, unknown>) {
    if (!this.pickings.has(pickingId)) {
      this.addPicking({
        id: pickingId,
        name: String(data.name),
        state: 'DRAFT',
        ownerId: (data.ownerId as string | null) ?? null,
        pickingTypeCode: data.pickingTypeCode as PickingTypeCode,
        backorderId: (data.backorderId as string | null) ?? null,
        priority: String(data.priority),
      });
    }
    this.wrote('createPicking', [pickingId]);
  }

  async moveMovesToPicking(moveIds: string[], pickingId: string) {
    for (const id of moveIds) {
      const move = this.moves.get(id);
      if (move !== undefined) {
        move.pickingId = pickingId;
        move.picked = false;
      }
      [...this.lines.values()]
        .filter((line) => line.moveId === id)
        .forEach((line) => {
          line.pickingId = pickingId;
          line.picked = false;
        });
    }
    this.wrote('moveMovesToPicking', moveIds);
  }

  async hasPickingNote(pickingId: string, title: string) {
    return this.notes.includes(`${pickingId}: ${title}`);
  }

  async addPickingNote(pickingId: string, text: string) {
    this.notes.push(`${pickingId}: ${text}`);
    this.wrote('addPickingNote', [pickingId]);
  }

  async assignPickings(pickingIds: string[]) {
    this.wrote('assignPickings', pickingIds);
  }

  async checkEntirePack(pickingIds: string[]) {
    this.wrote('checkEntirePack', pickingIds);
  }

  // Batches are not built yet; not counted as a write so the crash points stay where the tests put them.
  async leaveBatchBeforeBackorder(_pickingIds: string[], _context: { validatingIds: string[]; pickingsToDetach: string[] }) {}

  // Used by the done-line correction.
  async readRemovalInDate(key: string) {
    return planInDate({
      existing: this.quants.get(key) ?? null,
      incomingInDate: null,
      bypassesReservation: bypassesReservation(this.usage.get(parseQuantKey(key).locationId) ?? 'INTERNAL'),
      now: FAKE_NOW,
      digits: 2,
    });
  }

  async readLineQuantity(lineId: string) {
    return this.lines.get(lineId)?.quantity ?? null;
  }

  async unreserveMoves(moveIds: string[]) {
    this.wrote('unreserveMoves', moveIds);
  }

  async writeLine(lineId: string, data: Record<string, unknown>) {
    const line = this.lines.get(lineId);
    if (line !== undefined) {
      Object.assign(line, data);
    }
    this.wrote('writeLine', [lineId]);
  }
}
