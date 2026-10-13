import { MOVE_STATE, PICKING_TYPE_CODE, PRIORITY, RESERVATION_METHOD } from 'src/stock/stock-options.constant';
import { type MoveState } from 'src/stock/types/move-state.type';
import { type PickingTypeCode } from 'src/stock/types/picking-type-code.type';
import { type Priority } from 'src/stock/types/priority.type';
import { type ReservationMethod } from 'src/stock/types/reservation-method.type';

const SEQUENCE_PADDING = 5;

type PickingTypeFields = {
  code: PickingTypeCode;
  sequenceCode: string | null;
  referenceSequenceId: string | null;
  warehouseId: string | null;
  defaultLocationSrcId: string | null;
  defaultLocationDestId: string | null;
  useCreateLots: boolean;
  useExistingLots: boolean;
  printLabel: boolean;
};

type WarehouseFields = { id: string; name: string | null; code: string | null; lotStockId: string | null };

type PickingTypeDefaultsPlan =
  | { kind: 'refuse' }
  | {
      kind: 'update';
      data: Record<string, unknown>;
      sequence: { name: string; prefix: string; padding: number } | null;
    };

const sequenceValues = (sequenceCode: string, warehouse: { name: string | null; code: string | null } | null) =>
  warehouse === null
    ? { name: `Sequence ${sequenceCode}`, prefix: sequenceCode }
    : { name: `${warehouse.name ?? ''} Sequence ${sequenceCode}`, prefix: `${warehouse.code ?? ''}/${sequenceCode}/` };

// `warehouse` is the type's own, else the first warehouse. The
// default locations need a warehouse; without one the save is refused.
export const planPickingTypeDefaults = ({
  mode,
  type,
  warehouse,
  vendorsId,
  customersId,
}: {
  mode: 'created' | 'codeChanged';
  type: PickingTypeFields;
  warehouse: WarehouseFields | null;
  vendorsId: string | null;
  customersId: string | null;
}): PickingTypeDefaultsPlan => {
  if (warehouse === null) {
    return { kind: 'refuse' };
  }
  const data: Record<string, unknown> = {};
  const set = (field: keyof PickingTypeFields, value: unknown) => {
    if (type[field] !== value) {
      data[field] = value;
    }
  };

  if (mode === 'created' && type.warehouseId === null) {
    data.warehouseId = warehouse.id;
  }
  const source = type.code === PICKING_TYPE_CODE.INCOMING ? vendorsId : warehouse.lotStockId;
  const destination = type.code === PICKING_TYPE_CODE.OUTGOING ? customersId : warehouse.lotStockId;

  if (mode === 'codeChanged' || type.defaultLocationSrcId === null) {
    set('defaultLocationSrcId', source);
  }
  if (mode === 'codeChanged' || type.defaultLocationDestId === null) {
    set('defaultLocationDestId', destination);
  }
  if (type.code === PICKING_TYPE_CODE.INCOMING) {
    set('useCreateLots', true);
  }
  if (type.code === PICKING_TYPE_CODE.OUTGOING) {
    set('useExistingLots', true);
  }
  set('printLabel', type.code === PICKING_TYPE_CODE.OUTGOING);

  const sequence =
    mode === 'created' && type.referenceSequenceId === null && type.sequenceCode
      ? { ...sequenceValues(type.sequenceCode, warehouse), padding: SEQUENCE_PADDING }
      : null;

  return { kind: 'update', data, sequence };
};

export const planTypeSequenceRename = ({
  sequenceCode,
  warehouse,
  sequence,
}: {
  sequenceCode: string;
  warehouse: { name: string | null; code: string | null } | null;
  sequence: { name: string | null; prefix: string | null; padding: number } | null;
}): Record<string, unknown> | null => {
  if (sequence === null) {
    return null;
  }
  const wanted = sequenceValues(sequenceCode, warehouse);
  const data: Record<string, unknown> = {};

  for (const [field, value] of Object.entries(wanted)) {
    if (sequence[field as keyof typeof sequence] !== value) {
      data[field] = value;
    }
  }

  return Object.keys(data).length === 0 ? null : data;
};

const DATED_STATES: MoveState[] = [
  MOVE_STATE.DRAFT,
  MOVE_STATE.CONFIRMED,
  MOVE_STATE.WAITING,
  MOVE_STATE.PARTIALLY_AVAILABLE,
];
const KEPT_STATES: MoveState[] = [MOVE_STATE.ASSIGNED, MOVE_STATE.DONE, MOVE_STATE.CANCEL];

const dayMinus = (dateTime: string, days: number) => {
  const [year, month, day] = dateTime.slice(0, 10).split('-').map(Number);

  return new Date(Date.UTC(year, month - 1, day - days)).toISOString().slice(0, 10);
};

export const planReservationDates = ({
  before,
  after,
  daysBefore,
  daysBeforePriority,
  moves,
}: {
  before: ReservationMethod;
  after: ReservationMethod;
  daysBefore: number | null;
  daysBeforePriority: number | null;
  moves: { id: string; state: MoveState; date: string | null; priority: Priority; reservationDate: string | null }[];
}) => {
  if (before === after) {
    return [];
  }
  const changes: { id: string; reservationDate: string | null }[] = [];

  for (const move of moves) {
    let wanted: string | null | undefined;

    if (after === RESERVATION_METHOD.BY_DATE) {
      if (DATED_STATES.includes(move.state) && move.date !== null) {
        const days = move.priority === PRIORITY.URGENT ? daysBeforePriority ?? 0 : daysBefore ?? 0;
        wanted = dayMinus(move.date, days);
      }
    } else if (before === RESERVATION_METHOD.BY_DATE && !KEPT_STATES.includes(move.state)) {
      wanted = null;
    }
    if (wanted !== undefined && wanted !== move.reservationDate) {
      changes.push({ id: move.id, reservationDate: wanted });
    }
  }

  return changes;
};
