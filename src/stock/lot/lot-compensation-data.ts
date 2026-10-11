import { parseQuantKey } from 'src/stock/quant/quant-key';
import { type LotCompensation } from 'src/stock/lot/types/lot-compensation.type';

export const LOT_COMPENSATION_SELECTION = 'id moveLineId lotKey noLotKey quantity date';

// The record of a compensation; product, place, lot and owner come from the lot's stock key.
export const lotCompensationData = (row: LotCompensation) => {
  const parts = parseQuantKey(row.lotKey);

  return {
    moveLineId: row.moveLineId,
    productId: parts.productId,
    locationId: parts.locationId,
    lotId: parts.lotId,
    ownerId: parts.ownerId,
    quantity: row.quantity,
    date: row.date,
    lotKey: row.lotKey,
    noLotKey: row.noLotKey,
  };
};
