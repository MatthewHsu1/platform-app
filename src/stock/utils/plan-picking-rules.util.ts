import { LOCATION_USAGE, MOVE_STATE, MOVE_TYPE, PICKING_STATE } from 'src/stock/stock-options.constant';
import { type PropagatedField } from 'src/stock/types/propagated-field.type';
import { type PartnerLocations } from 'src/stock/types/partner-locations.type';
import { type LocationUsage } from 'src/stock/types/location-usage.type';
import { type MoveState } from 'src/stock/types/move-state.type';
import { type MoveType } from 'src/stock/types/move-type.type';
import { type PickingState } from 'src/stock/types/picking-state.type';

export const PICKING_TYPE_CHANGE_MESSAGE = 'Changing the operation type of this record is forbidden at this point.';
export const CANCELLED_SCHEDULED_DATE_MESSAGE = 'You cannot change the Scheduled Date on a cancelled transfer.';
export const DONE_MOVE_CANCEL_MESSAGE =
  "You cannot cancel a stock move that has been set to 'Done'. Create a return in order to reverse the moves which took place.";

const CLOSED_STATES: PickingState[] = [PICKING_STATE.DONE, PICKING_STATE.CANCEL];

// A contact's own vendor or customer location replaces the type's default of
// that usage. An empty property, or the seed row itself, is no own location.
export const planPickingLocations = ({
  state,
  returnPickingId,
  source,
  destination,
  partner,
  vendorsId,
  customersId,
}: {
  state: PickingState;
  returnPickingId: string | null;
  source: { id: string | null; usage: LocationUsage | null };
  destination: { id: string | null; usage: LocationUsage | null };
  partner: PartnerLocations | null;
  vendorsId: string | null;
  customersId: string | null;
}) => {
  if (CLOSED_STATES.includes(state) || returnPickingId !== null) {
    return null;
  }
  const supplier = partner?.propertyStockSupplierId ?? null;
  const customer = partner?.propertyStockCustomerId ?? null;

  return {
    locationId:
      source.usage === LOCATION_USAGE.SUPPLIER && supplier !== null && supplier !== vendorsId ? supplier : source.id,
    locationDestId:
      destination.usage === LOCATION_USAGE.CUSTOMER && customer !== null && customer !== customersId
        ? customer
        : destination.id,
  };
};

export const planPickingCreate = ({
  picking,
  typeMoveType,
  nextName,
  locations,
  actingMemberId,
}: {
  picking: {
    name: string | null;
    locationId: string | null;
    locationDestId: string | null;
    moveType: MoveType;
    responsibleUserId: string | null;
  };
  typeMoveType: MoveType;
  nextName: string | null;
  locations: { locationId: string | null; locationDestId: string | null } | null;
  actingMemberId: string | undefined;
}) => {
  const data: Record<string, unknown> = {};

  if (picking.name === null || picking.name === '') {
    data.name = nextName ?? '/';
  }
  if (picking.locationId === null && locations?.locationId != null) {
    data.locationId = locations.locationId;
  }
  if (picking.locationDestId === null && locations?.locationDestId != null) {
    data.locationDestId = locations.locationDestId;
  }
  // The field default is "As soon as possible", so only a row still on it takes the type's policy.
  if (picking.moveType === MOVE_TYPE.DIRECT && typeMoveType !== MOVE_TYPE.DIRECT) {
    data.moveType = typeMoveType;
  }
  if (picking.responsibleUserId === null && actingMemberId !== undefined) {
    data.responsibleUserId = actingMemberId;
  }

  return data;
};

export const planTypeChange = ({
  state,
  newType,
  nextName,
  moveIds,
}: {
  state: PickingState;
  newType: { id: string; defaultLocationSrcId: string | null; defaultLocationDestId: string | null; moveType: MoveType };
  nextName: string | null;
  moveIds: { id: string; pickingTypeId: string | null }[];
}):
  | { kind: 'refuse' }
  | { kind: 'apply'; picking: Record<string, unknown>; moves: { id: string; pickingTypeId: string }[] } => {
  if (CLOSED_STATES.includes(state)) {
    return { kind: 'refuse' };
  }

  return {
    kind: 'apply',
    picking: {
      name: nextName ?? '/',
      locationId: newType.defaultLocationSrcId,
      locationDestId: newType.defaultLocationDestId,
      moveType: newType.moveType,
    },
    moves: moveIds
      .filter((move) => move.pickingTypeId !== newType.id)
      .map((move) => ({ id: move.id, pickingTypeId: newType.id })),
  };
};

export const planPickingPropagation = ({
  changed,
  moves,
}: {
  changed: Partial<Record<PropagatedField, string | null>>;
  moves: ({ id: string; state: MoveState; locationDestUsage: LocationUsage | null } & Record<PropagatedField, string | null>)[];
}) =>
  moves.flatMap((move) => {
    if (move.locationDestUsage === LOCATION_USAGE.INVENTORY) {
      return [];
    }
    const data: Record<string, unknown> = {};
    const closed = move.state === MOVE_STATE.DONE || move.state === MOVE_STATE.CANCEL;

    for (const [field, value] of Object.entries(changed) as [PropagatedField, string | null][]) {
      // A finished move keeps its locations: its lines are history.
      if ((field === 'locationId' || field === 'locationDestId') && (value === null || closed)) {
        continue;
      }
      if (move[field] !== value) {
        data[field] = value;
      }
    }

    return Object.keys(data).length === 0 ? [] : [{ id: move.id, data }];
  });

export const planScheduledDateTyped = ({
  state,
  scheduledDate,
  moves,
}: {
  state: PickingState;
  scheduledDate: string | null;
  moves: { id: string; date: string | null }[];
}): { kind: 'refuse' } | { kind: 'apply'; moveIds: string[] } => {
  if (state === PICKING_STATE.CANCEL) {
    return { kind: 'refuse' };
  }
  if (state === PICKING_STATE.DONE || scheduledDate === null) {
    return { kind: 'apply', moveIds: [] };
  }

  return { kind: 'apply', moveIds: moves.filter((move) => move.date !== scheduledDate).map((move) => move.id) };
};
