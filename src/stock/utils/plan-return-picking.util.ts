import { MOVE_STATE, PICKING_STATE, PICKING_TYPE_CODE, PROCURE_METHOD } from 'src/stock/stock-options.constant';
import { isLocationUnder } from 'src/stock/utils/location-usage.util';
import { type ReturnLinkMove } from 'src/stock/utils/types/return-link-move.type';
import { type ReturnPickingValues } from 'src/stock/utils/types/return-picking-values.type';
import { type ReturnSourcePicking } from 'src/stock/utils/types/return-source-picking.type';
import { type ReturnTypeInfo } from 'src/stock/utils/types/return-type-info.type';
import { type MoveRow } from 'src/stock/types/move-row.type';

const ownReturnType = ({ pickingType, types }: { pickingType: ReturnTypeInfo; types: Map<string, ReturnTypeInfo> }) =>
  pickingType.returnPickingTypeId === null ? undefined : types.get(pickingType.returnPickingTypeId);

export const pickReturnType = (input: { pickingType: ReturnTypeInfo; types: Map<string, ReturnTypeInfo> }) =>
  ownReturnType(input) ?? input.pickingType;

// The same rule builds the return of a transfer and the exchange (the return of the return).
export const planReturnPicking = ({
  id,
  name,
  origin,
  picking,
  pickingType,
  types,
}: {
  id: string;
  name: string;
  origin: string;
  picking: ReturnSourcePicking;
  pickingType: ReturnTypeInfo;
  types: Map<string, ReturnTypeInfo>;
}): ReturnPickingValues => {
  const returnType = pickReturnType({ pickingType, types });
  const receivingType = ownReturnType({ pickingType, types });

  return {
    id,
    name,
    origin,
    state: PICKING_STATE.DRAFT,
    pickingTypeId: returnType.id,
    pickingTypeCode: returnType.code,
    returnPickingId: picking.id,
    locationId: picking.locationDestId,
    locationDestId:
      receivingType?.code === PICKING_TYPE_CODE.INCOMING ? receivingType.defaultLocationDestId : picking.locationId,
    moveType: picking.moveType,
    priority: picking.priority,
    scheduledDate: picking.scheduledDate,
    companyId: picking.companyId,
    personId: picking.personId,
    ownerId: picking.ownerId,
    responsibleUserId: null,
    backorderId: null,
    isLocked: true,
    printed: false,
  };
};

// Copies the fields a move keeps when copied (not state, picked, price, supply
// method, deadline, links or the returned move), then the return's own values.
// The packaging unit is derived from the unit, so it follows the row unit.
export const planReturnMove = ({
  id,
  move,
  quantity,
  uomId,
  picking,
  pickingType,
  now,
  isExchange,
}: {
  id: string;
  move: MoveRow;
  quantity: number;
  uomId: string | null;
  picking: ReturnPickingValues;
  pickingType: ReturnTypeInfo;
  now: string;
  isExchange: boolean;
}): Record<string, unknown> & { id: string } => {
  const isOutgoing = picking.pickingTypeCode === PICKING_TYPE_CODE.OUTGOING;
  const unitId = uomId ?? move.productUomId;

  return {
    id,
    productId: move.productId,
    descriptionPickingManual: move.descriptionPickingManual,
    sequence: move.sequence,
    origin: move.origin,
    propagateCancel: move.propagateCancel,
    restrictPartnerId: move.restrictPartnerId,
    packagingUomId: unitId,
    additional: move.additional,
    isInventory: move.isInventory,
    inventoryName: move.inventoryName,
    companyId: isOutgoing ? picking.companyId : move.companyId,
    personId: isOutgoing ? picking.personId : move.personId,
    productUomQty: quantity,
    productUomId: unitId,
    pickingId: picking.id,
    state: MOVE_STATE.DRAFT,
    date: now,
    locationId: picking.locationId ?? move.locationDestId,
    locationDestId: picking.locationDestId ?? move.locationId,
    locationFinalId: null,
    pickingTypeId: pickingType.id,
    warehouseId: pickingType.warehouseId,
    originReturnedMoveId: isExchange ? null : move.id,
    procureMethod: PROCURE_METHOD.MAKE_TO_STOCK,
    priority: picking.priority,
  };
};

const isLive = (move: ReturnLinkMove | undefined): move is ReturnLinkMove =>
  move !== undefined && move.state !== MOVE_STATE.CANCEL;

const isKnown = (move: ReturnLinkMove | undefined): move is ReturnLinkMove => move !== undefined;

// Origins: returns of the returned move's destination moves that came back
// under the new source, the returned move, and the other origins of its live
// destination moves. Destinations: the returns of its origin moves and the live
// destination moves of their live origins. An exchange drops the origins.
export const planReturnMoveLinks = ({
  moveId,
  newMoveSourcePath,
  graph,
  isExchange,
}: {
  moveId: string;
  newMoveSourcePath: string | null;
  graph: Map<string, ReturnLinkMove>;
  isExchange: boolean;
}) => {
  const moves = [...graph.values()];
  const returnsOf = (id: string) => moves.filter((candidate) => candidate.originReturnedMoveId === id);
  const get = (id: string) => graph.get(id);
  const returned = get(moveId);

  if (returned === undefined) {
    return { origIds: [], destIds: [] };
  }
  const origIds = new Set<string>();
  const destinations = returned.moveDestIds.map(get).filter(isKnown);

  for (const destination of destinations) {
    for (const back of returnsOf(destination.id)) {
      if (isLocationUnder(back.locationDestPath, newMoveSourcePath)) {
        origIds.add(back.id);
      }
    }
  }
  origIds.add(returned.id);
  for (const destination of destinations.filter(isLive)) {
    for (const sibling of destination.moveOrigIds.map(get).filter(isLive)) {
      origIds.add(sibling.id);
    }
  }

  const destIds = new Set<string>();
  const returnsOfOrigins = returned.moveOrigIds
    .map(get)
    .filter(isKnown)
    .flatMap((origin) => returnsOf(origin.id));

  returnsOfOrigins.forEach((back) => destIds.add(back.id));
  for (const back of returnsOfOrigins) {
    for (const originOfReturn of back.moveOrigIds.map(get).filter(isLive)) {
      for (const destination of originOfReturn.moveDestIds.map(get).filter(isLive)) {
        destIds.add(destination.id);
      }
    }
  }

  return { origIds: isExchange ? [] : [...origIds], destIds: [...destIds] };
};
