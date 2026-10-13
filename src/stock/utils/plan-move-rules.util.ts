import { LOCATION_USAGE, MOVE_STATE, PICKING_STATE } from 'src/stock/stock-options.constant';
import { type DeadlineMove } from 'src/stock/utils/types/deadline-move.type';
import { isLocationUnder } from 'src/stock/utils/location-usage.util';
import { compareAtDigits } from 'src/stock/utils/stock-uom.util';
import { type LocationUsage } from 'src/stock/types/location-usage.type';
import { type MoveState } from 'src/stock/types/move-state.type';
import { type PickingState } from 'src/stock/types/picking-state.type';
import { type Priority } from 'src/stock/types/priority.type';

export const CANCELLED_MOVE_QUANTITY_MESSAGE = 'You cannot change a cancelled stock move, create a new line instead.';
export const QUANTITY_PRECISION_MESSAGE =
  "The quantity done for the product {product} doesn't respect the rounding precision defined on the system. Please change the quantity done or the rounding precision in your settings.";
export const DONE_MOVE_UNIT_MESSAGE = "You cannot change the UoM for a stock move that has been set to 'Done'.";
export const LINKED_MOVE_DELETE_MESSAGE = 'You can not delete moves linked to another operation';
export const DONE_LINE_DELETE_MESSAGE =
  'Deleting product moves after the transfer is done? Try changing the done quantity to 0 instead.';
export const LOCATION_CHANGE_FINISHED_LINES_MESSAGE =
  'The source location cannot change: some of its lines are already done or cancelled and would be removed.';
export const DEMAND_CHANGED_NOTE = '{product}: demand changed from {before} to {after}';

type MoveCreateFields = {
  productUomId: string | null;
  packagingUomId: string | null;
  pickingTypeId: string | null;
  priority: Priority;
  companyId: string | null;
  personId: string | null;
  locationId: string | null;
  locationDestId: string | null;
  locationFinalId: string | null;
  warehouseId: string | null;
  state: MoveState;
  picked: boolean;
  additional: boolean;
};

export const planMoveCreate = ({
  move,
  picking,
  pickingType,
  productUomId,
  locations,
}: {
  move: MoveCreateFields;
  picking: {
    state: PickingState;
    locationId: string | null;
    locationDestId: string | null;
    pickingTypeId: string | null;
    priority: Priority;
    companyId: string | null;
    personId: string | null;
  } | null;
  pickingType: { id: string; defaultLocationSrcId: string | null; defaultLocationDestId: string | null } | null;
  productUomId: string;
  locations: Map<string, { parentPath: string | null; warehouseId: string | null }>;
}) => {
  const data: Record<string, unknown> = {};
  const set = <TField extends keyof MoveCreateFields>(field: TField, value: MoveCreateFields[TField]) => {
    if (move[field] !== value) {
      data[field] = value;
    }
  };
  const unit = move.productUomId ?? productUomId;

  set('productUomId', unit);
  if (move.packagingUomId === null) {
    set('packagingUomId', unit);
  }
  if (move.pickingTypeId === null && pickingType !== null) {
    set('pickingTypeId', pickingType.id);
  }
  if (picking !== null) {
    set('priority', picking.priority);
  }
  if (picking !== null && move.companyId === null && move.personId === null) {
    set('companyId', picking.companyId);
    set('personId', picking.personId);
  }
  const source = move.locationId ?? picking?.locationId ?? pickingType?.defaultLocationSrcId ?? null;

  set('locationId', source);
  if (move.locationDestId === null) {
    let destination = picking?.locationDestId ?? pickingType?.defaultLocationDestId ?? null;

    if (
      destination !== null &&
      move.locationFinalId !== null &&
      isLocationUnder(
        locations.get(move.locationFinalId)?.parentPath ?? null,
        locations.get(destination)?.parentPath ?? null,
      )
    ) {
      destination = move.locationFinalId;
    }
    set('locationDestId', destination);
  }
  if (source !== null) {
    set('warehouseId', locations.get(source)?.warehouseId ?? null);
  }
  if (picking?.state === PICKING_STATE.DONE) {
    set('state', MOVE_STATE.DONE);
    set('picked', true);
    set('additional', true);

    return { data, autoconfirm: false };
  }
  const live =
    picking !== null &&
    picking.state !== PICKING_STATE.DRAFT &&
    picking.state !== PICKING_STATE.CANCEL;

  if (live) {
    set('additional', true);
  }

  return { data, autoconfirm: live };
};

const LIVE_STATES: MoveState[] = [
  MOVE_STATE.WAITING,
  MOVE_STATE.CONFIRMED,
  MOVE_STATE.PARTIALLY_AVAILABLE,
  MOVE_STATE.ASSIGNED,
];

export const planDemandChange = ({
  moves,
  digits,
}: {
  moves: {
    id: string;
    pickingId: string | null;
    sourceUsage: LocationUsage | null;
    state: MoveState;
    quantity: number;
    oldDemand: number;
    newDemand: number;
  }[];
  digits: number;
}) => {
  const plan = {
    notes: [] as string[],
    unreserve: [] as string[],
    setPartiallyAvailable: [] as string[],
    reassign: [] as string[],
    recompute: [] as string[],
  };

  for (const move of moves) {
    const fromVendor = move.sourceUsage === LOCATION_USAGE.SUPPLIER;

    if (
      move.pickingId !== null &&
      move.state !== MOVE_STATE.DRAFT &&
      move.state !== MOVE_STATE.DONE &&
      compareAtDigits(move.oldDemand, move.newDemand, digits) !== 0
    ) {
      plan.notes.push(move.id);
    }
    if (LIVE_STATES.includes(move.state) && compareAtDigits(move.quantity, move.newDemand, digits) === 1) {
      plan.unreserve.push(move.id);
      if (fromVendor) {
        plan.reassign.push(move.id);
      }
      continue;
    }
    const stateAfter = move.state === MOVE_STATE.ASSIGNED ? MOVE_STATE.PARTIALLY_AVAILABLE : move.state;

    if (move.state === MOVE_STATE.ASSIGNED) {
      plan.setPartiallyAvailable.push(move.id);
    }
    if (fromVendor && stateAfter === MOVE_STATE.PARTIALLY_AVAILABLE) {
      plan.reassign.push(move.id);
    } else {
      plan.recompute.push(move.id);
    }
  }

  return plan;
};

// A deadline set on one move moves its original and destination moves by the
// same delta (or sets it on those without one); each move is visited once.
export const planDeadlineShift = ({
  changes,
  moves,
}: {
  changes: { moveId: string; before: string | null; after: string | null }[];
  moves: Map<string, DeadlineMove>;
}) => {
  const updates = new Map<string, string | null>();
  const visited = new Set(changes.map((change) => change.moveId));

  const visit = (moveId: string, previous: string | null, next: string | null) => {
    const move = moves.get(moveId);

    if (move === undefined) {
      return;
    }
    const delta = previous !== null && next !== null ? Date.parse(previous) - Date.parse(next) : 0;

    for (const neighbourId of move.neighbourIds) {
      const neighbour = moves.get(neighbourId);

      if (
        neighbour === undefined ||
        visited.has(neighbourId) ||
        neighbour.state === MOVE_STATE.DONE ||
        neighbour.state === MOVE_STATE.CANCEL
      ) {
        continue;
      }
      const current = neighbour.dateDeadline;
      let wanted: string | null;

      if (current !== null && delta !== 0) {
        wanted = new Date(Date.parse(current) - delta).toISOString();
      } else if (current === null || current !== next) {
        wanted = next;
      } else {
        continue;
      }
      visited.add(neighbourId);
      updates.set(neighbourId, wanted);
      visit(neighbourId, current, wanted);
    }
  };

  for (const change of changes) {
    visit(change.moveId, change.before, change.after);
  }

  return updates;
};

export const planMoveLocationChange = ({
  sourceChanged,
  destinationChanged,
  sourcePath,
  destinationPath,
  currentWarehouseId,
  sourceWarehouseId,
  destinationWarehouseId,
  lines,
}: {
  sourceChanged: boolean;
  destinationChanged: boolean;
  sourcePath: string | null;
  destinationPath: string | null;
  currentWarehouseId: string | null;
  sourceWarehouseId: string | null;
  destinationWarehouseId: string | null;
  lines: { id: string; locationPath: string | null; locationDestPath: string | null }[];
}) => {
  const destroyLines = sourceChanged
    ? lines.filter((line) => !isLocationUnder(line.locationPath, sourcePath)).map((line) => line.id)
    : [];
  const destroyed = new Set(destroyLines);
  const relocateLines = destinationChanged
    ? lines
        .filter((line) => !destroyed.has(line.id) && !isLocationUnder(line.locationDestPath, destinationPath))
        .map((line) => line.id)
    : [];
  const wantedWarehouse = sourceWarehouseId ?? destinationWarehouseId ?? null;

  return {
    destroyLines,
    resetSupply: destroyLines.length > 0,
    relocateLines,
    warehouseId: wantedWarehouse !== currentWarehouseId ? wantedWarehouse : undefined,
  };
};

// A new source drops the lines outside it; a finished line cannot be dropped,
// so the whole change is refused.
export const moveLocationRefusal = ({
  sourceChanged,
  sourcePath,
  lines,
}: {
  sourceChanged: boolean;
  sourcePath: string | null;
  lines: { locationPath: string | null; state: MoveState }[];
}) =>
  sourceChanged &&
  lines.some(
    (line) =>
      (line.state === MOVE_STATE.DONE || line.state === MOVE_STATE.CANCEL) && !isLocationUnder(line.locationPath, sourcePath),
  )
    ? LOCATION_CHANGE_FINISHED_LINES_MESSAGE
    : null;

export const moveDeleteRefusal = ({
  state,
  hasLinks,
  hasDoneLines,
}: {
  state: MoveState;
  hasLinks: boolean;
  hasDoneLines: boolean;
}) => {
  if (state !== MOVE_STATE.DRAFT && state !== MOVE_STATE.CANCEL && hasLinks) {
    return LINKED_MOVE_DELETE_MESSAGE;
  }

  return hasDoneLines ? DONE_LINE_DELETE_MESSAGE : null;
};
